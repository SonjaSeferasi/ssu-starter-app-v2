const path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','-p','3020'],{cwd:root,env:{...process.env,SOCIALU_BUILD_TARGET:'oceania-a'},stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code||0});
