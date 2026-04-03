// validator.ts
function isValidClpid(clpid) {
  const pattern = /^[^\s\d]+(?:-[^\s\d]+)*(?:-|\.)?$/u;
  return pattern.test(clpid);
}
export {
  isValidClpid
};
