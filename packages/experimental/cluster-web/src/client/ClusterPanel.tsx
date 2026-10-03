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
import { IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'

/** Business action injected by the browser plugin. */
export interface ClusterPanelInjected {
  /** Read the cluster the session belongs to. */
  load: (sessionId: SessionId) => Promise<RemoteResult<ClusterOverview>>
  /** Read the document text a settings surface edits. */
  readConfiguration: (sessionId: SessionId) => Promise<RemoteResult<ClusterConfiguration>>
  /** Write edited document text, and report why when it is refused. */
  saveConfiguration: (sessionId: SessionId, text: string) => Promise<RemoteResult<ClusterSaveResult>>
}

/** Full props of the cluster conversation-header action. */
export type ClusterPanelProps =
  PropsRuntime<'conversation.session.header.actions'> & ClusterPanelInjected & PropsLocale<typeof NS>

/** The document as the host formats it, plus whether a file already exists. */
export interface ClusterConfiguration {
  /** Whether a document was written before. */
  readonly configured: boolean
  /** YAML text to edit. */
  readonly text: string
}

/** What a write attempt answered: written, or refused with a reason. */
export type ClusterSaveResult = { readonly saved: true } | { readonly saved: false; readonly reason: string }

/** One failure line: this seam keeps the code beside the message. */
function failureText(error: { readonly code: string; readonly message: string }): string {
  return `${error.message} (${error.code})`
}

/**
 * Render the cluster behind the invoking session, on demand.
 * @param props - framework-bound session identity, the injected reader, and the translator.
 * @returns the trigger, and the loaded panel once it is open.
 */
export function ClusterPanel({ sessionId, load, readConfiguration, saveConfiguration, t }: ClusterPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ClusterOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [configured, setConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<string | null>(null)
  const sessionRef = useRef(sessionId)
  const generation = useRef(0)
  sessionRef.current = sessionId

  useEffect(() => {
    generation.current += 1
    setOpen(false)
    setLoading(false)
    setView(null)
    setError(null)
    setEditing(false)
    setText('')
    setOutcome(null)
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

  // The document is read when the editor is opened rather than with the view: a
  // reader who only wants to look at the roster should not pull a document too.
  const openEditor = useCallback(async (): Promise<void> => {
    const requested = sessionId
    const asked = ++generation.current
    setEditing(true)
    setOutcome(null)
    const result = await readConfiguration(requested)
    if (sessionRef.current !== requested || generation.current !== asked) return
    if (result.ok) {
      setText(result.value.text)
      setConfigured(result.value.configured)
    } else {
      setOutcome(failureText(result.error))
    }
  }, [readConfiguration, sessionId])

  const save = useCallback(async (): Promise<void> => {
    const requested = sessionId
    setSaving(true)
    const result = await saveConfiguration(requested, text)
    if (sessionRef.current !== requested) return
    setSaving(false)
    // A refused field is an answer, not a failure to report: the host's reason is
    // the only thing that can say which field to fix.
    if (!result.ok) {
      setOutcome(failureText(result.error))
      return
    }
    setOutcome(result.value.saved ? t('saved') : result.value.reason)
    if (result.value.saved) setConfigured(true)
  }, [saveConfiguration, sessionId, t, text])

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
        <section className={css.panel} aria-label={t('title')} data-cluster-panel="">
          {content === null
            ? <p className={css.empty} role="status">{loading ? t('loading') : error ?? ''}</p>
            : (
              <>
                <p className={css.title} data-cluster-title="">{content.title}</p>
                {content.unconfigured === undefined
                  ? null
                  : (
                    <p className={css.unconfigured} data-cluster-unconfigured="" role="status">
                      {content.unconfigured}
                    </p>
                  )}
                <p className={css.summary} data-cluster-summary="">{content.summary.join('')}</p>
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
                  <IconRefreshOutline14 size={14} />
                  {t('refresh')}
                </button>
                {editing
                  ? (
                    <div className={css.section} data-cluster-editor="">
                      <h3 className={css.sectionTitle}>{configured ? t('document') : t('starter')}</h3>
                      <textarea
                        className={css.editor}
                        data-cluster-document=""
                        aria-label={configured ? t('document') : t('starter')}
                        rows={12}
                        value={text}
                        onChange={(event) => { setText(event.target.value) }}
                      />
                      <button type="button" disabled={saving} onClick={() => { void save() }}>{t('save')}</button>
                      {outcome === null ? null : <p className={css.status} role="status">{outcome}</p>}
                    </div>
                  )
                  : (
                    <button type="button" onClick={() => { void openEditor() }}>{t('settings')}</button>
                  )}
              </>
            )}
        </section>
      )}
    </div>
  )
}
