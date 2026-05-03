import { useEffect, useRef, useState, useCallback } from 'react';
import type { ActiveCommentTask } from '../types';
import { useComments } from '../hooks/useComments';
import { useActivity } from '../hooks/useActivity';
import { ActivityFeed } from './ActivityFeed';
import { COMMENT_MAX_LENGTH, TAB_COMMENTS, TAB_ACTIVITY } from '../utils/constants';
import {
  LABEL_COMMENT_FETCH_ERROR,
  LABEL_COMMENT_INPUT_ARIA,
  LABEL_COMMENT_INPUT_PLACEHOLDER,
  LABEL_COMMENT_LOADING,
  LABEL_COMMENT_NO_COMMENTS,
  LABEL_COMMENT_OVERLAY_ARIA,
  LABEL_COMMENT_PANEL_ARIA_PREFIX,
  LABEL_COMMENT_PANEL_CLOSE_ARIA,
  LABEL_COMMENT_SAVE,
  LABEL_COMMENT_SAVE_ARIA,
  LABEL_COMMENT_SAVE_ERROR,
  LABEL_COMMENT_VALIDATION_TOO_LONG,
  LABEL_TAB_COMMENTS,
  LABEL_TAB_ACTIVITY,
  LABEL_TAB_COMMENTS_ARIA,
  LABEL_TAB_ACTIVITY_ARIA,
} from '../utils/strings';

type ActiveTab = typeof TAB_COMMENTS | typeof TAB_ACTIVITY;

interface CommentPanelProps {
  activeTask: ActiveCommentTask | null;
  onClose: () => void;
  onCommentAdded: (taskId: string) => void;
}

export function CommentPanel({
  activeTask,
  onClose,
  onCommentAdded,
}: CommentPanelProps) {
  const [inputText, setInputText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(TAB_COMMENTS);

  const { comments, fetchLoading, fetchError, fetchComments, postComment } =
    useComments();

  const {
    entries: activityEntries,
    fetchLoading: activityLoading,
    fetchError: activityError,
    fetchActivity,
  } = useActivity();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTask) return;
    setInputText('');
    setValidationError(null);
    setSaveError(null);
    setActiveTab(TAB_COMMENTS);
    fetchComments(activeTask.id);
    fetchActivity(activeTask.id);
  }, [activeTask, fetchComments, fetchActivity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (activeTask) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTask, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    if (value.length > COMMENT_MAX_LENGTH) {
      setValidationError(LABEL_COMMENT_VALIDATION_TOO_LONG);
    } else {
      setValidationError(null);
    }
  };

  const handleSave = async () => {
    if (!activeTask) return;
    setSaveError(null);
    setIsSaving(true);
    const result = await postComment(activeTask.id, inputText.trim());
    setIsSaving(false);
    if (result === null) {
      setSaveError(LABEL_COMMENT_SAVE_ERROR);
    } else {
      setInputText('');
      setValidationError(null);
      onCommentAdded(activeTask.id);
      fetchActivity(activeTask.id);
    }
  };

  const isSaveDisabled =
    inputText.trim() === '' ||
    inputText.length > COMMENT_MAX_LENGTH ||
    isSaving;

  if (!activeTask) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      aria-label={LABEL_COMMENT_OVERLAY_ARIA}
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${LABEL_COMMENT_PANEL_ARIA_PREFIX} ${activeTask.title}`}
        className="relative z-10 flex flex-col w-full max-w-md bg-white dark:bg-gray-900 shadow-xl h-full"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {activeTask.title}
          </h2>
          <button
            aria-label={LABEL_COMMENT_PANEL_CLOSE_ARIA}
            onClick={onClose}
            className="ml-2 shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            aria-label={LABEL_TAB_COMMENTS_ARIA}
            onClick={() => setActiveTab(TAB_COMMENTS)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === TAB_COMMENTS
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {LABEL_TAB_COMMENTS}
          </button>
          <button
            aria-label={LABEL_TAB_ACTIVITY_ARIA}
            onClick={() => setActiveTab(TAB_ACTIVITY)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === TAB_ACTIVITY
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {LABEL_TAB_ACTIVITY}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {activeTab === TAB_COMMENTS && (
            <>
              {fetchLoading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {LABEL_COMMENT_LOADING}
                </p>
              )}
              {!fetchLoading && fetchError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {LABEL_COMMENT_FETCH_ERROR}
                </p>
              )}
              {!fetchLoading && !fetchError && comments.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {LABEL_COMMENT_NO_COMMENTS}
                </p>
              )}
              {!fetchLoading && !fetchError && comments.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2"
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {comment.text}
                      </p>
                      <time
                        className="mt-1 block text-xs text-gray-400 dark:text-gray-500"
                        dateTime={comment.createdAt}
                      >
                        {new Date(comment.createdAt).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {activeTab === TAB_ACTIVITY && (
            <ActivityFeed
              entries={activityEntries}
              fetchLoading={activityLoading}
              fetchError={activityError}
            />
          )}
        </div>

        {activeTab === TAB_COMMENTS && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            {saveError && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                {saveError}
              </p>
            )}
            {validationError && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                {validationError}
              </p>
            )}
            <textarea
              aria-label={LABEL_COMMENT_INPUT_ARIA}
              placeholder={LABEL_COMMENT_INPUT_PLACEHOLDER}
              value={inputText}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs ${
                  inputText.length > COMMENT_MAX_LENGTH
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {inputText.length}/{COMMENT_MAX_LENGTH}
              </span>
              <button
                aria-label={LABEL_COMMENT_SAVE_ARIA}
                onClick={handleSave}
                disabled={isSaveDisabled}
                className="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {LABEL_COMMENT_SAVE}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
