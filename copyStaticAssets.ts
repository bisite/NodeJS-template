import * as shell from "shelljs";

shell.mkdir("dist/public");
shell.cp("-R", "src/public/css", "dist/public/css");
shell.cp("-R", "src/public/js", "dist/public/js");
shell.cp("-R", "src/public/mp4", "dist/public/mp4");
shell.cp("-R", "src/public/vendor", "dist/public/vendor/");