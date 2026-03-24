interface Props {
  className?: string
}

export function TextBLeft({ className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 6 14"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline", verticalAlign: "middle" }} aria-hidden
    >
      <path d="M5,1 L2,1 L2,13 L5,13" />
    </svg>
  )
}
