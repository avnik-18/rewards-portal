// Lookup helpers + value/team catalogues the UI reads directly. They re-export
// the domain modules so app/components/hooks never import mock data — the
// façade is the only layer allowed to (sir's review #3: the mock dataset must
// not ship through component imports).

export { person, initials, personDisplayName } from '../mock-data-parts/people'

export { TEAMS, type TeamId } from '../mock-data-parts/team'

export { CORE_VALUES, VALUE_KEYS, VALUE_TEMPLATES, type ValueKey, type ValueLived } from '../mock-data-parts/values'
