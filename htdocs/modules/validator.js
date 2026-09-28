// validator.ts
function isValidClpid(clpid) {
  const pattern = /^[^\s]+(?:-[^\s]+)*(?:-|\.)?$/u;
  return pattern.test(clpid);
}
export {
  isValidClpid
};
