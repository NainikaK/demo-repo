import {
  LABEL_COMMENT_BUTTON_ARIA,
} from '../utils/strings';

interface CommentButtonProps {
  commentCount: number;
  onClick: () => void;
}

export function CommentButton({ commentCount, onClick }: CommentButtonProps) {
  return (
    <button
      aria-label={`${LABEL_COMMENT_BUTTON_ARIA} (${commentCount})`}
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
    >
      <span aria-hidden="true">💬</span>
      <span>{commentCount}</span>
    </button>
  );
}
