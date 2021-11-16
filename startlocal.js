const { exec } = require("child_process");

async function main() {
    console.log('arlocal')
    await exec('npx arlocal 8080')
    console.log('start')
    await exec('node startmining')
    console.log('end')
}

main()