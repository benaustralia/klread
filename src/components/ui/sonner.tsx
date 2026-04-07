import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = (props: ToasterProps) => (
  <Sonner
    style={{ fontFamily: "inherit", overflowWrap: "anywhere" }}
    toastOptions={{
      unstyled: true,
      classNames: {
        toast:
          "bg-secondary-background text-foreground border-border border-2 font-heading shadow-shadow rounded-base text-[13px] flex items-center gap-2.5 p-4 w-[356px] [&:has(button)]:justify-between",
        description: "font-base",
        actionButton:
          "font-base border-2 text-[12px] h-6 px-2 bg-main text-main-foreground border-border rounded-base shrink-0",
        cancelButton:
          "font-base border-2 text-[12px] h-6 px-2 bg-secondary-background text-foreground border-border rounded-base shrink-0",
        error: "bg-main! text-main-foreground!",
      },
    }}
    {...props}
  />
)

export { Toaster }
