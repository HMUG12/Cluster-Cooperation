/**
 * The cluster panel: a conversation-header action that reads the cluster on demand.
 *
 * The component decides nothing about the cluster. It asks the host for the
 * finished view, hands that view to the panel derivation, and lays out what
 * comes back — which is why the interesting rules are tested without a browser.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web/client
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ClusterOverview } from '../types.ts'
import { clusterPanel } from './panel.ts'
import { NS } from './locales.ts'
import css from './ClusterPanel.module.css'

/** Business action injected by the browser plugin. */
export interface ClusterPanelInjected {
  /** Read the cluster the session belongs to. */
  load: (sessionId: SessionId) => Promise<RemoteResult<ClusterOverview>>
}

/** Full props of the cluster conversation-header action. */
export type ClusterPanelProps =
  PropsRuntime<'conversation.session.header.actions'> & ClusterPanelInjected & PropsLocale<typeof NS>

/** One failure line: this seam keeps the code beside the message. */
function failureText(error: { readonly code: string; readonly message: string }): string {
  return `${error.message} (${error.code})`
}

/**
 * Render the cluster behind the invoking session, on demand.
 * @param props - framework-bound session identity, the injected reader, and the translator.
 * @returns the trigger, and the loaded panel once it is open.
 */
export function ClusterPanel({ sessionId, load, t }: ClusterPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ClusterOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef(sessionId)
  const generation = useRef(0)
  sessionRef.current = sessionId

  useEffect(() => {
    generation.current += 1
    setOpen(false)
    setLoading(false)
    setView(null)
    setError(null)
  }, [sessionId])

  const refresh = useCallback(async (): Promise<void> => {
    const requested = sessionId
    const asked = ++generation.current
    setLoading(true)
    const result = await load(requested)
    if (sessionRef.current !== requested || generation.current !== asked) return
    setLoading(false)
    if (result.ok) {
      setView(result.value)
      setError(null)
    } else {
      setError(failureText(result.error))
    }
  }, [load, sessionId])

  const content = useMemo(() => (view === null ? null : clusterPanel(view, t)), [view, t])
  return (
    <div data-cluster-action="">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next && view === null) void refresh()
        }}
      >
        {t('title')}
      </button>
      {open && (
        <section aria-label={t('title')} data-cluster-panel="">
          {content === null
            ? <p role="status">{loading ? t('loading') : error ?? ''}</p>
            : (
              <>
                <p data-cluster-title="">{content.title}</p>
                {content.unconfigured === undefined
                  ? null
                  : <p data-cluster-unconfigured="" role="status">{content.unconfigured}</p>}
                <p data-cluster-summary="">{content.summary.join('')}</p>
                {content.sections.map(section => (
                  <div key={section.key} className={css.section} data-cluster-section={section.key}>
                    <h3 className={css.sectionTitle}>{section.title}</h3>
                    {section.rows.length === 0
                      ? <p className={css.empty}>{section.empty}</p>
                      : (
                        <ul className={css.rows}>
                          {section.rows.map(row => (
                            <li key={row.key} className={css.row}>
                              <span className={css.label} data-cluster-label="">{row.label}</span>
                              <span className={css.detail} data-cluster-detail="">{row.detail}</span>
                              {row.status === '' ? null : <span className={css.status} data-cluster-status="">{row.status}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                ))}
                <button type="button" disabled={loading} onClick={() => { void refresh() }}>
                  {t('refresh')}
                </button>
              </>
            )}
        </section>
      )}
    </div>
  )
}
