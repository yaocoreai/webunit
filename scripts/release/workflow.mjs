export const releaseTargets = Object.freeze(['node', 'container', 'cloudflare'])

export function assertReleaseTarget(target) {
  if (!releaseTargets.includes(target)) throw new Error('Release target must be node, container, or cloudflare')
  return target
}

export function releasePreparationCommands(target) {
  assertReleaseTarget(target)
  return Object.freeze([
    `db:migrate:${target}`,
    `db:seed:${target}`,
    `queue:prepare:${target}`,
    `db:doctor:${target}`,
    `queue:audit:${target}`,
  ])
}

export function releaseActivationCommands(target) {
  assertReleaseTarget(target)
  return Object.freeze([
    `jobs:sync:${target}`,
    `jobs:audit:${target}`,
    `db:doctor:${target}`,
    `queue:audit:${target}`,
  ])
}
