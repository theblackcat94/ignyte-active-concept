import "./registration-marks.css";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export default function RegistrationMarks({ corners = ["top-left", "top-right", "bottom-left", "bottom-right"] }: { corners?: Corner[] }) {
  return <>{corners.map(corner => <span key={corner} className={`home-registration-mark home-registration-mark-${corner}`} aria-hidden="true" />)}</>;
}
