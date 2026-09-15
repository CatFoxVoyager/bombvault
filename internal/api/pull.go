package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"path"
	"path/filepath"
	"strings"
	"time"

	"database/sql"

	"github.com/junkerderprovinz/bombvault/internal/restic"
	"github.com/junkerderprovinz/bombvault/internal/restickey"
	"github.com/junkerderprovinz/bombvault/internal/schedule"
	"github.com/junkerderprovinz/bombvault/internal/secret"
	"github.com/junkerderprovinz/bombvault/internal/store"
)

// Pulling: fetching snapshots OUT of another instance's repository into this
// one (#227).
//
// It is the mirror image of off-site replication. There this box pushes its own
// snapshots outward with `restic copy`; here it runs the same copy with the two
// ends swapped, so a box can fetch a neighbour's backups without the neighbour
// having to configure anything or even be awake.
//
// THREE RULES HOLD THIS FILE TOGETHER, and each has a way of failing quietly.
//
//  1. THE SOURCE IS SOMEBODY ELSE'S AND IS ONLY EVER READ. Exactly two engine
//     calls may touch it: RepoOpens, to see whether the key fits, and Copy's
//     source argument. Never EnsureRepo (it initialises), never Unlock (it
//     deletes lock files), never Forget or Prune. A lock error on a foreign
//     repository is not ours to repair: it usually means the far instance is
//     backing up right now.
//  2. THE TWO ENDS HAVE DIFFERENT PASSWORDS. Two BombVaults never share one,
//     because each derives its repository password from its own APP_KEY. That
//     is what restic.Mode.From exists for, and getting it wrong produces a
//     message that reads as "wrong APP_KEY" for a key that was typed correctly.
//  3. THE SOURCE LENDS US NOTHING AND WE LEND IT NOTHING. NoAmbientCreds
//     withholds this box's rclone config, and an `rclone:` source is refused
//     outright, for the confused-deputy reason foreign.go sets out: rclone reads
//     its remotes from OUR file and would authenticate to a caller-chosen
//     endpoint with our secrets.
//
// ONE SOURCE IS ONE DOMAIN, deliberately. A sender replicates per domain into
// separate repositories, so a source repository holds one domain's snapshots and
// the local repository it lands in is that same domain's. "Pull everything" is
// several sources, which is also how it reads on screen: one row per thing being
// fetched, each with its own schedule and its own last result.

// pullOpen resolves a pull source's location and opens it READ-ONLY, returning
// the resolved location and the mode to read it with.
//
// It follows receiverOpen, which does the same job for a received repository,
// and adds the two hardenings the foreign-restore path has and the receiver does
// not need: no ambient credentials, and no rclone location.
func (s *Service) pullOpen(ctx context.Context, ps store.PullSource, settings store.Settings) (string, restic.Mode, error) {
	loc := strings.TrimSpace(ps.Repo)
	if loc == "" {
		return "", restic.Mode{}, errors.New("missing repository location")
	}
	if isRcloneLocation(loc) {
		// The same refusal foreign.go gives, for the same reason: rclone ignores
		// the environment and reads its remotes from this instance's config file,
		// so an operator-supplied rclone location would authenticate to an
		// endpoint of their choosing using OUR stored secrets.
		return "", restic.Mode{}, errors.New("an rclone: location cannot be a pull source, because rclone would use THIS instance's remotes to reach it. Use the repository's own address (rest:, s3:, sftp: or b2:) with its own credentials")
	}
	// Resolve exactly as receiverOpen does: an already-absolute path inside the
	// host mount is taken as-is, everything else goes through resolveRepo so the
	// error names the host root and suggests the relative path to type instead.
	var repo string
	mountRoot := path.Clean(filepath.ToSlash(s.cfg.HostMountRoot))
	inMount := mountRoot != "." && mountRoot != "/" &&
		strings.HasPrefix(path.Clean(filepath.ToSlash(loc)), mountRoot+"/")
	if !restic.IsRemoteRepo(loc) && inMount {
		repo = loc
	} else {
		resolved, err := s.resolveRepo(loc)
		if err != nil {
			return "", restic.Mode{}, err
		}
		repo = resolved
	}

	keyBytes, err := secret.Decrypt(s.cfg.AppKey, ps.AppKeyEnc)
	if err != nil {
		return "", restic.Mode{}, errors.New("could not decrypt the stored APP_KEY for this pull source")
	}
	sourceKey := string(keyBytes)
	// Guard the shape BEFORE any use: restickey.Derive panics on non-hex input by
	// design, so this regexp is what stands between a corrupted row and a crash.
	if !foreignKeyRe.MatchString(sourceKey) {
		return "", restic.Mode{}, errors.New("the stored APP_KEY is not 64 lowercase hex characters")
	}

	// The source's own backend credentials, never this box's. A row with no
	// credential set gets an empty Env rather than the shared ones, which is the
	// difference against an off-site target: that one is ours and may borrow.
	var env []string
	if ref := strings.TrimSpace(ps.CredsRef); ref != "" {
		if c, cErr := s.decodeCloudFor(settings, ref); cErr == nil {
			env = cloudEnv(c)
		} else {
			log.Printf("api: pull source %s: credential set decode failed (continuing without it): %v", ps.ID, cErr) //nolint:gosec // G706: ps.ID is an opaque store-generated id
		}
	}

	base := restic.Mode{NoLock: true, NoAmbientCreds: true, Env: env}
	encMode := base
	encMode.Encrypted = true
	encMode.Password = restickey.Derive(sourceKey)
	switch {
	case s.engine.RepoOpens(ctx, repo, encMode):
		return repo, encMode, nil
	case s.engine.RepoOpens(ctx, repo, base):
		return repo, base, nil
	default:
		return "", restic.Mode{}, errors.New("could not open the pull source: wrong APP_KEY, or the location is not a BombVault or restic repository")
	}
}

// PullFromSource runs one pull and records its verdict. It returns how many
// snapshots the copy was asked to carry.
func (s *Service) PullFromSource(ctx context.Context, ps store.PullSource) (int, error) {
	n, err := s.pullFromSource(ctx, ps)
	ok := sql.NullBool{Bool: err == nil, Valid: true}
	msg := ""
	if err != nil {
		msg = scrubError(err)
	}
	if rErr := s.store.UpdatePullSourceResult(ps.ID, time.Now().Unix(), ok, msg, n); rErr != nil {
		log.Printf("api: pull source %s: could not record the result: %v", ps.ID, rErr) //nolint:gosec // G706: ps.ID is an opaque store-generated id
	}
	return n, err
}

func (s *Service) pullFromSource(ctx context.Context, ps store.PullSource) (int, error) {
	domain := strings.TrimSpace(ps.Domain)
	if domain == "" {
		return 0, errors.New("this pull source names no domain, so there is nowhere for its snapshots to land")
	}
	settings, dest, err := s.domainRepoSource(domain, "local")
	if err != nil {
		return 0, fmt.Errorf("resolve the local %s repository: %w", domain, err)
	}
	src, srcMode, err := s.pullOpen(ctx, ps, settings)
	if err != nil {
		return 0, err
	}

	// EVERYTHING FROM HERE ON WRITES TO `dest` AND ONLY TO `dest`. The source
	// appears exactly twice more: in the listing below, which is read-only by
	// mode, and as Copy's source argument.
	destMode := s.primaryModeFor(settings, domain, dest)
	if err := s.EnsureRepo(ctx, dest, destMode); err != nil {
		return 0, fmt.Errorf("ensure the local %s repository: %w", domain, err)
	}
	// Clearing a stale lock is right here and wrong one line up: this repository
	// is ours, BombVault is its only writer, so a lock left behind is always
	// stale. listSnapshots below refuses to do the same for the source, because
	// its mode says NoLock.
	s.unlockStale(ctx, dest, destMode)

	srcSnaps, err := s.listSnapshots(ctx, src, srcMode)
	if err != nil {
		return 0, fmt.Errorf("list the source's snapshots: %w", err)
	}
	if len(srcSnaps) == 0 {
		return 0, nil
	}
	pending := 0
	if dstSnaps, dErr := s.listSnapshots(ctx, dest, destMode); dErr != nil {
		log.Printf("api: pull %s: could not estimate how much is pending (continuing): %v", domain, dErr) //nolint:gosec // G706: domain comes from a fixed set
	} else {
		pending = len(restic.PendingCopyIDs(srcSnaps, dstSnaps))
	}
	if pending == 0 {
		// Nothing new. Saying so is not the same as failing, and it is the
		// ordinary outcome of a scheduled pull between two backups.
		return 0, nil
	}

	// The copy carries the DESTINATION's mode, with the source's credentials
	// hung off it. nil for the snapshot ids on purpose: restic's own dedup is
	// stricter than PendingCopyIDs (it compares full metadata), so the count
	// above is for display and restic decides what actually moves.
	copyMode := destMode
	copyMode.From = &restic.From{Encrypted: srcMode.Encrypted, Password: srcMode.Password}
	copyMode.Env = append(append([]string{}, destMode.Env...), srcMode.Env...)
	lim := restic.Limits{DownloadKBps: ps.LimitDownload, UploadKBps: ps.LimitUpload}
	if err := s.engine.Copy(ctx, dest, src, nil, lim, copyMode); err != nil {
		return 0, fmt.Errorf("copy from the source: %w", err)
	}
	return pending, nil
}

// RunPulls is the scheduled sweep: every enabled source whose cadence says it is
// due gets pulled once. A source that fails does not stop the others.
func (s *Service) RunPulls(ctx context.Context) error {
	settings, err := s.store.GetSettings()
	if err != nil {
		return fmt.Errorf("read settings: %w", err)
	}
	if !settings.PullEnabled {
		return nil
	}
	sources, err := s.store.ListPullSources()
	if err != nil {
		return fmt.Errorf("list pull sources: %w", err)
	}
	now := time.Now()
	for _, ps := range sources {
		if !ps.Enabled {
			continue
		}
		period := cadencePeriodSeconds(ps.Cadence)
		if period <= 0 {
			continue // 'off', or a cadence with no period: only the button runs it
		}
		// schedule.PeriodDue, not a raw "now minus last is bigger than the
		// period". The receiver's own comment explains what the naive form costs:
		// a run that starts a minute late pushes the next one a minute later
		// again, so a daily job drifts until it silently runs every other day.
		if !schedule.PeriodDue(time.Unix(ps.LastPullAt, 0), now, period) {
			continue
		}
		if _, pErr := s.PullFromSource(ctx, ps); pErr != nil {
			log.Printf("api: pull source %s failed: %v", ps.ID, pErr) //nolint:gosec // G706: ps.ID is an opaque store-generated id
		}
	}
	return nil
}

// pullProbe opens a source read-only and discards the result. It is what the
// Test button runs, and what create and update run before they persist: a
// mistyped location or key is refused while the person who typed it is still
// looking at the form, rather than becoming a scheduled job that fails every
// night at four with a message nobody reads.
func (s *Service) pullProbe(ctx context.Context, ps store.PullSource) error {
	settings, err := s.store.GetSettings()
	if err != nil {
		return fmt.Errorf("read settings: %w", err)
	}
	_, _, err = s.pullOpen(ctx, ps, settings)
	return err
}
