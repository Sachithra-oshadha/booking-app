import Link from "next/link";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const cls = (variant: Variant, size: Size, extra?: string) =>
  [styles.btn, styles[variant], size === "sm" ? styles.sm : "", extra ?? ""].join(" ");

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={cls(variant, size, className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cls(variant, size)}>
      {children}
    </Link>
  );
}
