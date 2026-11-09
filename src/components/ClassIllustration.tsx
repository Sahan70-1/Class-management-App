import { Check, GraduationCap } from "lucide-react";

export function ClassIllustration() {
  return (
    <div className="class-illustration" aria-hidden="true">
      <span className="illustration-orbit orbit-one" />
      <span className="illustration-orbit orbit-two" />
      <span className="spark spark-one">✦</span>
      <span className="spark spark-two">✧</span>
      <span className="small-circle" />
      <div className="floating-check">
        <Check size={20} />
      </div>
      <div className="illustrated-book">
        <span />
        <span />
        <span />
        <span />
        <div className="book-spine" />
      </div>
      <div className="illustrated-calendar">
        <div className="calendar-binding">
          <i />
          <i />
        </div>
        <div className="illustration-calendar-head">YOUR NEXT CHAPTER</div>
        <div className="illustration-calendar-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              className={i === 5 ? "checked" : i === 2 ? "tinted" : ""}
              key={i}
            >
              {i === 5 ? <Check size={20} /> : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="floating-cap">
        <GraduationCap size={35} />
      </div>
      <span className="illustration-dot" />
    </div>
  );
}
