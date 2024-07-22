/* Call circleci cli for every staged yml file
   https://github.com/okonet/lint-staged#example-wrap-filenames-in-single-quotes-and-run-once-per-file
*/
module.exports = {
  ".circleci/*.yml": (filenames) =>
    filenames.map((filename) => `circleci config check '${filename}'`),
  "*.{js,jsx,ts,tsx}": (filenames) => {
    return [
      `prettier --write ${filenames.join(" ")}`,
      `eslint --cache --fix ${filenames.join(" ")}`,
    ];
  },
  "*.{css,less,scss,md}": (filenames) => {
    return [
      `prettier --write ${filenames.join(" ")}`,
    ];
  },
};
