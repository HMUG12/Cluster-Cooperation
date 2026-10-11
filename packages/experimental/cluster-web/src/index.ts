/**
 * The cluster overview service a Web panel reads.
 *
 * It is the only cluster surface that crosses to the browser: generated Remote
 * methods return the finished view, hand out and accept the document text, and
 * bring the declared members up. A client bundle may not import another plugin's
 * values, so the panel derives nothing itself. The declarations, the folded
 * spend, and the protocol vocabulary are read structurally, exactly as the
 * `/cluster` command reads them, so this service needs no dependency on the
 * packages that own them and keeps loading when none is mounted.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { ClusterProtocols, ClusterTaskKind } from '@deepseek-ai/dsh-experimental-tool-cluster'
import { clusterOverview } from './overview.ts'
import type { ClusterOverview, ClusterSpendRow } from './types.ts'

/** Composition entry for the cluster Web service. */
export interface Config {
  /** Subagent provider that starts a member brought up with a fresh context. */
  readonly freshProvider?: string
  /** Subagent provider that starts a member brought up on the Lead's context. */
  readonly forkProvider?: string
}

/** Loader schema for the cluster Web service. */
export const Config: z<Config> = z.object({
  freshProvider: z.string(),
  forkProvider: z.string(),
})

/** Structural view of the optional cluster declaration service. */
interface ClusterConfigSource {
  defaultClusterName(): string
  /** Whether a document exists. Present on services that report it. */
  readonly configured?: boolean
  /** Read the document as the text a surface edits. */
  editableText?(): string
  /** Parse, validate and write candidate document text. */
  saveText?(text: string): unknown
  /** Read one declared member, when the reader knows how to list members. */
  member?(cluster: string, name: string): { readonly description?: string; readonly context?: 'fresh' | 'fork' } | undefined
  /** Read every declared member name, in document order. */
  membersFor?(cluster: string): readonly { readonly name: string }[]
  /** Read the route one declared member is bound to. */
  routeFor?(cluster: string, name: string): {
    readonly provider: string
    readonly model: string
    readonly reasoningEffort?: string
  } | undefined
  /** Read the briefing one declared member is spawned with. */
  briefingFor?(cluster: string, name: string): string | undefined
}

/** Structural view of the optional folded-spend view. */
interface ClusterSpendSource {
  members(): readonly ClusterSpendRow[]
}

/** Cluster overview service consumed by the Web panel. */
export class ClusterWeb extends TypertRemoteService {
  static Config: z<Config> = Config

  static inject = ['agentTeams']

  private readonly freshProvider: string
  private readonly forkProvider: string

  /**
   * Register the service under the name the browser calls.
   * @param ctx - owning context.
   * @param config - subagent providers a panel-initiated spawn uses.
   */
  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'clusterWeb')
    // Resolved once, here, so a composition that states no provider still gets
    // the two the shipped Team tool row is configured with.
    this.freshProvider = config.freshProvider ?? 'spawn'
    this.forkProvider = config.forkProvider ?? 'fork'
  }

  /**
   * Read the cluster's roster, board, and spend through the generated Remote API.
   * @param agent - exact live Team member used as the authority credential.
   * @returns the read-only view a panel renders, already ordered and counted.
   */
  @Remote('overview')
  remoteOverview(agent: Agent): ClusterOverview {
    const clusterName = this.clusterName()
    const classify = this.classify()
    const configured = this.lookup<ClusterConfigSource>('clusterConfig')?.configured
    return clusterOverview({
      ...clusterName === undefined ? {} : { clusterName },
      // Absent means the service predates the flag or is not mounted; a panel
      // must not block a cluster it cannot get an answer about.
      ...configured === undefined ? {} : { configured },
      view: {
        members: this.ctx.agentTeams.listMembers(agent),
        tasks: this.ctx.agentTeams.listTasks(agent),
      },
      spend: this.spend() ?? [],
      ...classify === undefined ? {} : { classify },
    })
  }

  /**
   * Write edited document text through the generated Remote API.
   *
   * The text is parsed and validated by the service that owns the schema, so a
   * rejected field never reaches the disk and the reason travels back as a value
   * rather than as a transport failure: a rejected field is an ordinary outcome
   * of editing, not an exception a panel has to catch to stay usable. Authority
   * is the same as for reading, and a service that cannot accept text says so.
   * @param agent - exact live Team member used as the authority credential.
   * @param text - candidate document text, parsed and validated before it is written.
   * @returns whether it was written, and the reason when it was not.
   */
  @Remote('saveConfiguration')
  remoteSaveConfiguration(agent: Agent, text: string): { saved: true } | { saved: false; reason: string } {
    this.requireMember(agent)
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    if (source?.saveText === undefined) {
      return { saved: false, reason: 'this cluster configuration service cannot accept text, so a panel cannot write it' }
    }
    try {
      source.saveText(text)
      return { saved: true }
    } catch (error) {
      return { saved: false, reason: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Read the document a settings surface edits.
   *
   * The text is produced by the service that owns the document, for the same
   * reason the write is parsed there: a client that formatted or parsed on its own
   * would hold a second opinion about the same file. An unconfigured cluster
   * reads as the starter rather than as nothing, because the panel's job in that
   * state is to hand the user something to edit; whether a file already exists
   * travels alongside it, so the surface can say so instead of implying an empty
   * document was loaded from disk.
   * @param agent - exact live Team member used as the authority credential.
   * @returns whether a document exists, and the text to edit.
   * @throws Error when the caller is not a cluster member or no service is mounted.
   */
  @Remote('readConfiguration')
  remoteReadConfiguration(agent: Agent): { configured: boolean; text: string } {
    this.requireMember(agent)
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    if (source === undefined) {
      throw new Error('no cluster configuration service is mounted, so there is nothing to read or write')
    }
    // A service that predates this reader still answers the declaration questions
    // this package depends on, so it reports that it cannot edit rather than
    // refusing the panel outright.
    if (source.editableText === undefined) {
      throw new Error('this cluster configuration service cannot produce document text, so a panel cannot edit it')
    }
    return { configured: source.configured ?? false, text: source.editableText.call(source) }
  }

  /**
   * Bring the declared members up through the generated Remote API.
   *
   * This is the human half of `spawn_teammate`: the tool needs a model turn and
   * the Lead's judgement about whom to delegate to, while a person looking at a
   * panel already knows which members the document declares. The route and the
   * briefing come from the same accessors the tool reads, so a name is bound to
   * the same model whichever path brought it up. A member already on the roster
   * is left alone, and one that fails to start is reported instead of dropped.
   * @param agent - exact live Team member used as the authority credential.
   * @returns the members brought up, and every declared member that was not.
   */
  @Remote('spawnDeclared')
  async remoteSpawnDeclared(agent: Agent): Promise<{
    readonly spawned: readonly string[]
    readonly skipped: readonly { readonly name: string; readonly reason: string }[]
  }> {
    this.requireMember(agent)
    // The Team service accepts one spawner: the exact live Lead.
    if (this.ctx.agentTeams.tryMembership(agent)?.role !== 'lead') {
      return { spawned: [], skipped: [{ name: 'lead', reason: 'only the Lead session can bring members up' }] }
    }
    const clusterName = this.clusterName()
    if (clusterName === undefined) {
      return {
        spawned: [],
        skipped: [{ name: 'members', reason: 'no cluster document declares members, so there is nobody to bring up' }],
      }
    }
    const declared = this.declaredMemberNames(clusterName)
    if (declared === undefined || declared.length === 0) {
      return {
        spawned: [],
        skipped: [{ name: 'members', reason: 'no cluster document declares members, so there is nobody to bring up' }],
      }
    }
    const live = new Set(this.ctx.agentTeams.listMembers(agent).map(member => member.name))
    const spawned: string[] = []
    const skipped: { name: string; reason: string }[] = []
    for (const name of declared) {
      if (live.has(name)) {
        skipped.push({ name, reason: 'already on the roster' })
        continue
      }
      try {
        await this.spawn(agent, clusterName, name)
        spawned.push(name)
      } catch (error) {
        skipped.push({ name, reason: error instanceof Error ? error.message : String(error) })
      }
    }
    return { spawned, skipped }
  }

  /**
   * Create one declared member as a teammate of this Lead.
   *
   * A spawn starts the member's first turn, so the prompt is a task it can act
   * on without one: it reports what it can take on and waits. The panel owns no
   * cancellation channel, so the signal is one this call settles on its own.
   * @param lead - the Lead Agent the Team service accepts as the spawner.
   * @param clusterName - cluster whose declaration the member comes from.
   * @param name - declared member name.
   */
  private async spawn(lead: Agent, clusterName: string, name: string): Promise<void> {
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    const declared = source?.member?.call(source, clusterName, name)
    const route = source?.routeFor?.call(source, clusterName, name)
    const briefing = source?.briefingFor?.call(source, clusterName, name)
    const context = declared?.context ?? 'fresh'
    await this.ctx.agentTeams.spawnTeammate(lead, {
      name,
      description: declared?.description ?? `Declared member of cluster "${clusterName}".`,
      prompt: [
        { type: 'text' as const, text: `<system-reminder>\nYou are teammate "${name}".\n</system-reminder>\n\n` },
        ...briefing === undefined ? [] : [{ type: 'text' as const, text: `${briefing}\n\n` }],
        {
          type: 'text' as const,
          text: 'A person brought you up from the cluster panel, so you have no assignment yet. Send the Lead one short message saying what you can take on, then wait for its instructions.',
        },
      ],
      context,
      provider: context === 'fork' ? this.forkProvider : this.freshProvider,
      ...route === undefined ? {} : { agentOptions: route },
      signal: new AbortController().signal,
    })
  }

  /**
   * Refuse a caller that belongs to no cluster.
   *
   * Reading, writing, and bringing members up all go through this, so a session
   * that is not part of a cluster gets the same answer whichever one it asks for.
   * @param agent - exact live Team member used as the authority credential.
   * @throws Error when the member is in no cluster.
   */
  private requireMember(agent: Agent): void {
    if (this.ctx.agentTeams.listMembers(agent).length === 0) {
      throw new Error(`session ${agent.id} belongs to no cluster, so it cannot configure one`)
    }
  }

  /**
   * Read the declared cluster name, when a composition mounts the declarations.
   *
   * A name is decoration on a view, so a cluster that cannot be named yet still
   * reports its roster and its board: the state a first-time user is in has no
   * document at all, and the declarations answer that question by throwing
   * because no cluster can be selected. Routing asks the same service by member
   * name and still fails loudly there, which is where an unusable document has
   * to surface.
   * @returns the declared cluster name, or undefined when there is none to read.
   */
  private clusterName(): string | undefined {
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    if (source === undefined) return undefined
    try {
      return source.defaultClusterName()
    } catch (error) {
      // Named because the swallow is deliberate: an unnameable cluster is the
      // unconfigured state this view reports, not a failure of the read.
      this.ctx.logger.debug(`cluster view could not name the cluster: ${String(error)}`)
      return undefined
    }
  }

  /**
   * Read the member names one cluster declares.
   *
   * A service that predates this reader, or a document that cannot be read,
   * answers with undefined rather than an empty list: the two are different
   * answers to "is there anybody to bring up".
   * @param clusterName - the cluster whose declaration to read.
   * @returns the declared names in document order, or undefined when none can be read.
   */
  private declaredMemberNames(clusterName: string): readonly string[] | undefined {
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    const read = source?.membersFor
    if (source === undefined || read === undefined) return undefined
    try {
      return read.call(source, clusterName).map(member => member.name)
    } catch (error) {
      this.ctx.logger.debug(`cluster view could not read the declared members: ${String(error)}`)
      return undefined
    }
  }

  /**
   * Read the protocol vocabulary the tool package publishes.
   *
   * The vocabulary is read across the service boundary rather than imported: a
   * value import of another workspace package does not resolve in this
   * repository's test resolution, while a structural read — the same shape used
   * for the declarations and the spend — does. Without it the view reports no
   * kinds instead of guessing one.
   */
  private classify(): ((subject: string) => ClusterTaskKind) | undefined {
    const source = this.lookup<ClusterProtocols>('clusterProtocols')
    return source === undefined ? undefined : subject => source.kindOf(subject)
  }

  /** Read the folded spend rows, when a composition folds any. */
  private spend(): readonly ClusterSpendRow[] | undefined {
    const source = this.lookup<ClusterSpendSource>('clusterSpend')
    return source === undefined ? undefined : source.members()
  }

  /**
   * Read one optional service without requiring it.
   * @param name - service name to look up.
   * @returns the service, or undefined when the composition mounts none.
   */
  private lookup<T>(name: string): T | undefined {
    return (this.ctx as unknown as { get(key: string): unknown }).get(name) as T | undefined
  }
}

export default ClusterWeb
