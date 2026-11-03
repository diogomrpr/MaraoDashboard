import {describeAuthoring,validateDashboard,planDashboardEdit} from './authoring.js';

try {
  let input='';for await(const chunk of process.stdin)input+=chunk;
  const request=input.trim()?JSON.parse(input):{};
  if(!request||typeof request!=='object'||Array.isArray(request))throw new Error('Supply a JSON object.');
  const commands={describe:describeAuthoring,validate:validateDashboard,plan:planDashboardEdit},command=process.argv[2];
  if(!Object.hasOwn(commands,command))throw new Error('Use describe, validate or plan.');
  const result=commands[command](request);
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.valid===false||result.diagnostics?.some(item=>item.severity==='error'))process.exitCode=1;
}catch(error){process.stdout.write(JSON.stringify({valid:false,diagnostics:[{path:'',severity:'error',message:error instanceof SyntaxError?'Invalid JSON input.':error.message}]})+'\n');process.exitCode=1;}
