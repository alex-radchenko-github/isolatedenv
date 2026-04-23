import classes from "./skip-nav.module.css";

export function SkipNav() {
  return (
    <a href="#main-content" className={classes.skipLink}>
      Skip to main content
    </a>
  );
}
