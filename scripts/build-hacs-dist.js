const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const integrationRoot = path.join(repoRoot, "custom_components", "marao_dashboard");
const distRoot = path.join(repoRoot, "dist", "custom_components", "marao_dashboard");

fs.rmSync(path.join(repoRoot, "dist"), { recursive: true, force: true });
fs.cpSync(integrationRoot, distRoot, {
  recursive: true,
  filter: (source) => {
    const name = path.basename(source);
    return name !== ".DS_Store" && name !== "__pycache__" && !name.endsWith(".pyc");
  },
});
