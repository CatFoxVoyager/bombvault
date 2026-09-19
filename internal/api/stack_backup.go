package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"slices"
	"sort"
	"strings"

	"github.com/junkerderprovinz/bombvault/internal/model"
	"github.com/junkerderprovinz/bombvault/internal/restic"
)

// stackSnapshotTag is the snapshot tag of a stack's project directory. It has
// the same shape as container:<ref>, so restic's per-tag retention applies
// unchanged and a stack restore finds the snapshot without a second index.
func stackSnapshotTag(project string) string { return "stack:" + project }

// stackDirFor returns the compose project directory of a container, translated
// into this process's view and checked for containment, plus the project name.
// ok is false when the container is not part of a compose project, carries no
// working-dir label, or the directory lies outside the host mount.
func (s *Service) stackDirFor(in model.Inspect) (project, dir string, ok bool) {
	project = composeProject(in.Config.Labels)
	if project == "" {
		return "", "", false
	}
	host, has := composeProjectDataDir(in.Config.Labels)
	if !has {
		return "", "", false
	}
	cand, inMount := s.toContainerPath(host)
	if !inMount {
		return "", "", false
	}
	return project, cand, true
}

// stackDirsFor maps each compose project among the named containers to its
// directory, so a backup round visits each project once.
func (s *Service) stackDirsFor(ctx context.Context, names []string) map[string]string {
	dirs := map[string]string{}
	for _, name := range names {
		in, err := s.docker.Inspect(ctx, name)
		if err != nil {
			// A container that vanished mid-round is not a reason to skip the
			// rest of the stacks; the member backup reports its own failure.
			log.Printf("api: stack backup: inspect %s: %v", name, err)
			continue
		}
		project, dir, ok := s.stackDirFor(in)
		if !ok {
			continue
		}
		dirs[project] = dir
	}
	return dirs
}

// backupStackDir snapshots one project directory into the containers repo under
// the stack tag. It stops nothing: the directory holds the compose file and the
// stack's shared files, and each member has already been stopped and started
// around its own data.
func (s *Service) backupStackDir(ctx context.Context, project, dir string) error {
	settings, err := s.store.GetSettings()
	if err != nil {
		return fmt.Errorf("stack %s: read settings: %w", project, err)
	}
	repo, err := s.containersRepoPath(settings)
	if err != nil {
		return fmt.Errorf("stack %s: %w", project, err)
	}
	mode := s.primaryModeFor(settings, "containers", repo)
	if err := s.EnsureRepo(ctx, repo, mode); err != nil {
		return fmt.Errorf("stack %s: %w", project, err)
	}
	tags := []string{stackSnapshotTag(project), "p1"}
	if _, err := s.engine.Backup(ctx, repo, []string{dir}, tags, mode); err != nil {
		return fmt.Errorf("stack %s: %w", project, err)
	}
	return nil
}

// BackupStacks backs up the project directory of every compose stack in names,
// once per stack. Inside each member's snapshot, every service would walk and
// hash the whole directory again on every run. A stack that fails does not stop
// the others.
func (s *Service) BackupStacks(ctx context.Context, names []string) error {
	dirs := s.stackDirsFor(ctx, names)
	if len(dirs) == 0 {
		return nil
	}
	projects := make([]string, 0, len(dirs))
	for p := range dirs {
		projects = append(projects, p)
	}
	sort.Strings(projects)

	var failed []string
	for _, p := range projects {
		if err := s.backupStackDir(ctx, p, dirs[p]); err != nil {
			log.Printf("api: stack backup: %v", err)
			failed = append(failed, p)
			continue
		}
		log.Printf("api: stack backup: %s (%s) done", p, dirs[p])
	}
	if len(failed) > 0 {
		return fmt.Errorf("stack backup failed for: %s", strings.Join(failed, ", "))
	}
	return nil
}

// latestStackSnapshot returns the newest snapshot carrying the project's stack
// tag, or false when there is none.
func (s *Service) latestStackSnapshot(ctx context.Context, repo string, mode restic.Mode, project string) (restic.Snapshot, bool) {
	snaps, err := s.engine.Snapshots(ctx, repo, mode)
	if err != nil {
		log.Printf("api: stack restore: list snapshots: %v", err)
		return restic.Snapshot{}, false
	}
	want := stackSnapshotTag(project)
	var best restic.Snapshot
	var found bool
	for _, sn := range snaps {
		if !slices.Contains(sn.Tags, want) {
			continue
		}
		// Times are RFC3339 from restic, so a string compare orders them; taking
		// the max avoids depending on the listing order.
		if !found || sn.Time > best.Time {
			best, found = sn, true
		}
	}
	return best, found
}

// RestoreStackDir restores a compose project's working directory in place from
// its stack snapshot. It returns false and no error when there is none: older
// backups keep the folder inside each member's snapshot, so it comes back with
// the members.
func (s *Service) RestoreStackDir(ctx context.Context, project, source string) (ok bool, err error) {
	settings, repo, err := s.domainRepoSource("containers", source)
	if err != nil {
		return false, err
	}
	mode := s.primaryModeFor(settings, "containers", repo)
	sn, found := s.latestStackSnapshot(ctx, repo, mode, project)
	if !found || len(sn.Paths) == 0 {
		return false, nil
	}
	if err := s.engine.RestorePath(ctx, repo, sn.ID, sn.Paths[0], mode); err != nil {
		return false, fmt.Errorf("restore stack %s: %w", project, err)
	}
	log.Printf("api: stack restore: %s from %s", project, sn.ID[:8])
	return true, nil
}

// projectOfMember reports the compose project a container belongs to, or "" if
// it is not part of one. Reads the live container first and falls back to the
// stored definition, so a stack restore onto a box where the containers no
// longer exist can still find the project name.
func (s *Service) projectOfMember(ctx context.Context, name string) string {
	if in, err := s.docker.Inspect(ctx, name); err == nil {
		if p := composeProject(in.Config.Labels); p != "" {
			return p
		}
	}
	tg, err := s.store.GetTargetByContainer(name)
	if err != nil || len(tg.Definition) == 0 {
		return ""
	}
	var def struct {
		Inspect model.Inspect `json:"inspect"`
	}
	if err := json.Unmarshal([]byte(tg.Definition), &def); err != nil {
		return ""
	}
	return composeProject(def.Inspect.Config.Labels)
}
