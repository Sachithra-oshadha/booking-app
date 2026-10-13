import styles from "./Input.module.css";

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${styles.control} ${className ?? ""}`} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${styles.control} ${className ?? ""}`} rows={3} {...p} />;
}

export function Select({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${styles.control} ${className ?? ""}`} {...p} />;
}

export function Checkbox({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" {...p} /> {label}
    </label>
  );
}
