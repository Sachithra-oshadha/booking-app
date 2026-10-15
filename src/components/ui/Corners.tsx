/** The four "+" registration marks of the blueprint frame. Parent must be position: relative (or use .blueprint). */
export function Corners() {
  return (
    <>
      <i aria-hidden="true" className="corner tl" />
      <i aria-hidden="true" className="corner tr" />
      <i aria-hidden="true" className="corner bl" />
      <i aria-hidden="true" className="corner br" />
    </>
  );
}
