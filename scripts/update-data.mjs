import { appendFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { syncHistory } from './history-sync.mjs';

try {
  const { values } = parseArgs({options:{
    'compare-published': {type:'boolean',default:false},
    'dry-run': {type:'boolean',default:false},
    source: {type:'string',default:'national'},
  }});
  const result = await syncHistory({
    target: new URL('../public/data/history.json', import.meta.url),
    comparePublished: values['compare-published'],
    dryRun: values['dry-run'],
    source: values.source,
  });
  const newest = result.bundle.draws[0];
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,
      `changed=${result.changed}\ndata_changed=${result.dataChanged}\ndeploy_required=${result.deploymentRequired}\nlatest_issue=${newest.drawNum}\nlatest_date=${newest.drawDate}\n`, 'utf8');
  }
  console.log(JSON.stringify({historyCount:result.bundle.draws.length,latestIssue:newest.drawNum,
    latestDate:newest.drawDate,changed:result.changed,deploymentRequired:result.deploymentRequired,dryRun:values['dry-run'],source:values.source}));
  if (!result.changed && !result.deploymentRequired) console.log('没有新开奖，无需发布。');
} catch (error) {
  console.error(`同步未完成：${error.message}`);
  process.exitCode = 1;
}
