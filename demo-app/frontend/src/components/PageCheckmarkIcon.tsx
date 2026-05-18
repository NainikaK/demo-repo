import { CheckCircle } from 'lucide-react';

export interface PageCheckmarkIconProps {
  className?: string;
}

const ICON_SIZE = 8;
const ICON_COLOR = '#22C55E';

export function PageCheckmarkIcon(_props: PageCheckmarkIconProps) {
  return (
    <CheckCircle
      width={ICON_SIZE}
      height={ICON_SIZE}
      color={ICON_COLOR}
      aria-hidden="true"
      focusable={false}
      className="pointer-events-none"
    />
  );
}
