declare module '*.sql?raw' {
  const value: string;
  export default value;
}
declare module '*.sql' {
  const value: string;
  export default value;
}
