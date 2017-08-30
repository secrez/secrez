const p = process.argv

for (let i=0;i<p.length;i++) {
  if (i && (p[i-1] === '--dataparentdir')) {
    process.env.DATA_PARENT_DIR = p[i]
  }
  if (i && (p[i-1] === '--privatekey')) {
    process.env.PRIVATE_KEY = p[i]
  }
  if (i && (p[i-1] === '--publickey')) {
    process.env.PUBLIC_KEY = p[i]
  }
}
