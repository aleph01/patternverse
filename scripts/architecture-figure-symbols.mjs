// Quiet filled figures, matched to the light editorial illustration language.
// View-specific symbols keep overhead plans distinct from occupied sections.
export function standingFigure(x, floor, height = 74, faceRight = true) {
  return `<g transform="translate(${x} ${floor}) scale(${((faceRight ? 1 : -1) * height) / 100} ${height / 100})" class="person"><path d="M-7-76C-15-79-15-92-7-96C1-100 10-95 10-88L15-84 10-81C10-75 5-72 0-73L-1-67C9-64 13-55 14-43L5-38 3-28 10-2 1 0-8-23-10-1-19 0-18-32-20-52C-21-63-15-68-8-69Z"/><path d="M4-61Q12-61 14-51L17-39 28-49 34-44 21-32Q15-29 10-36L3-49Z"/></g>`;
}

export function planFigure(x, y, scale = 1, angle = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path d="M-19 12Q-16 4-7 3H7Q16 4 19 12V17Q0 24-19 17Z" class="person"/><ellipse cx="0" cy="0" rx="10" ry="12" class="plan-head"/><path d="M-3-10L0-15L3-10" class="person"/></g>`;
}

export function seatedFigure(x, y, scale = 1, faceRight = false) {
  // x/y locate the head. The figure faces left, towards a window or outlook.
  return `<g transform="translate(${x} ${y}) scale(${faceRight ? -scale : scale} ${scale})" class="person"><path d="M-6 9Q-15 5-13-5Q-11-17-1-14Q8-13 9-4L5 7-2 11Z"/><path d="M-10-4L-18 0-10 4Z"/><path d="M3 11Q13 15 16 25L24 32H-10Q-24 30-27 41L-35 62H-52V70H-25L-10 44H23Q38 43 32 33L21 20Q18 13 9 11Z"/><path d="M4 15L-10 17H-20L-23 22-5 26 12 22Z"/></g>`;
}
