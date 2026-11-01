# 大乐透分组研究台 · Cloudflare Pages

正式公开地址：[打开大乐透分组研究台](https://letou-group-lab.pages.dev)。2026-11-01已核验并发布第26124期（2026-10-31）官方开奖，共300期；正式网址的数据已与本次文件逐项核对。当前部署：[bb6ef45a](https://bb6ef45a.letou-group-lab.pages.dev)。现有其他 Cloudflare 项目未改动。

公开站点采用纯静态托管：Vue 页面、浏览器分析 Worker 和已核验的开奖 JSON。没有 Pages Functions、服务端 Worker、数据库或 AI API。`src/workers/analysis.worker.ts` 是用户浏览器内的后台计算线程。

保留近期总览、逐期分布、规律图鉴、分析方法，前区13种规律、后区11种。分析规则与 Python 参考实现进行完整结果比对；动态规律只读取当期开奖以前的数据。

## 本地检查

构建工具需要 Node.js 22+，独立 Python 参考测试需要 Python 3.10+，浏览器检查使用已安装的 Chrome。

```powershell
npm ci
npm test
npm run build
npm run check:static
npx wrangler pages dev dist --port 5190 --ip 127.0.0.1
# 在另一个终端中执行
npm run test:e2e
```

这里的5190仅用于迁移版本预览。原项目的本地前端5173、Python后端8000保持原有启动方式。

## 发布

```powershell
npx wrangler login
# 首次创建，已有项目不重复创建
npx wrangler pages project create letou-group-lab --production-branch main --force
npm run deploy
```

使用自己的 Cloudflare 账号授权，不把令牌写入代码或文档。项目的 `wrangler.jsonc` 仅配置静态产物目录；发布流程不创建数据库或启用服务器函数。

当前项目已创建，后续直接运行 `npm run deploy`。上述首次创建命令的 `--force` 用于明确选择原生 Pages，避免新版 Wrangler 首次创建时转向 Workers；创建后不需要此参数。当前45项算法、数据、官方表格解析与同步测试已通过；首次迁移的手机/桌面浏览器检查及依赖审计也已通过。

也可在 Cloudflare Pages 的 Direct Upload 页面上传 `dist/` 内容或其 ZIP 包。ZIP 根目录必须直接包含 `index.html`。Direct Upload 项目后续仍可用 Wrangler 或 CI 更新。

## 更新开奖数据

```powershell
npm run data:sync
npm run deploy
```

本地同步默认请求中国体彩网历史接口；云端工作流使用[江苏体彩官方公开历史表](https://api.js-lottery.com/wfzq/dlt/data)的分页数据，因原接口在GitHub服务器返回HTTP 567。江苏体彩公开表的300期已与现有官方缓存逐期核对一致，可通过 `node scripts/update-data.mjs --source jiangsu --compare-published --dry-run` 复核。

两种来源都校验期号、真实日期、号码范围、数量、唯一性和冲突，成功后原子替换 `public/data/history.json`。没有新开奖时保持原文件和核验时间不变。每个网络请求最多尝试3次，失败时保留已核验的数据；相同期号出现冲突时停止更新，留待核对。

自动发布前使用 `node scripts/update-data.mjs --compare-published` 同时比较正式网站：防止线上回退，也能发现“仓库已更新但上次发布失败”的情况并补发。加 `--dry-run` 可只读检查。发布后用 `node scripts/verify-deployment.mjs` 确认线上文件与本次发布一致。

网络环境可能受到官方来源限制；此时不能宣称已自动更新，需要在能访问官方接口的环境重试。

“更新数据”按钮只重新读取本站已发布的最新文件。访客不能修改全站数据。核验时间来自文件元数据，不会在访问或切换窗口时伪造为当前时间。

## GitHub Actions 自动更新（已准备，尚未启用）

公开代码仓库：[ashcoder123-dot/letou-group-lab](https://github.com/ashcoder123-dot/letou-group-lab)。已核对GitHub授权账号及其已验证主邮箱，仓库归属符合用户指定账号。

工作流位于 `.github/workflows/update-history.yml`。北京时间每天07:17、22:17、23:17检查数据；使用GitHub标准Linux运行器，未变化时跳过依赖安装、构建和发布。每次部署前运行算法比对与同步测试、静态构建检查；部署成功并核对线上数据后才回写已核验文件到仓库。不使用存储构建产物的付费功能。

工作流、45项测试和公开仓库已准备。**GitHub账号已授权并核对；完整云端抓取、45项测试和静态构建已通过，定时更新尚未启用。** [云端验证记录](https://github.com/ashcoder123-dot/letou-group-lab/actions/runs/41288650552)使用江苏体彩公开历史表，确认300期、第26124期与线上一致；没有使用Cloudflare令牌或执行发布。

`CLOUDFLARE_ACCOUNT_ID` 仓库Secret已配置，仍需所有者在官网创建专用Pages令牌并保存为 `CLOUDFLARE_API_TOKEN`。正式发布与线上验证通过后，才设置 `AUTO_UPDATE_ENABLED=true`。公开仓库使用GitHub标准Linux运行器。

启用顺序：

1. 使用指定邮箱对应的GitHub账号完成官方授权，并核对账号实际用户名和已验证邮箱。
2. 按用户已确认的选择上传到其自己的公开仓库，使用免费标准Linux运行器。工作流未设置 `AUTO_UPDATE_ENABLED=true` 时，定时/推送任务不会分配运行器执行。
3. 手动运行工作流，保留 `verify_only=true`，验证GitHub云端能抓取官方数据并完成全部测试、构建。这一步已通过，不需要Cloudflare部署密钥，不会发布或提交数据。
4. 在Cloudflare官方控制台创建限定本账号的“Cloudflare Pages / Edit”API令牌。现有本机OAuth授权可以部署，但访问令牌管理接口被拒绝，不能用它自动生成CI专用令牌。不要把密码、验证码或令牌发到聊天中。
5. 在GitHub仓库 Settings → Secrets and variables → Actions 中设置 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 两个仓库Secret。账号ID必须对应当前已核对的Cloudflare账号，工作流会检查，防止部署到其他账号。
6. 手动运行 `verify_only=false`、`force_deploy=true`，确认发布和线上验证均成功，再将仓库变量 `AUTO_UPDATE_ENABLED` 设置为 `true`，启用后续定时任务。

调度可能因平台负载延迟；定时任务不会保证在指定秒数运行。公开仓库长时间没有活动时可能停用定时工作流，可在Actions中查看状态。当前流程会在真实开奖数据更新后提交记录，不生成保活用的虚假数据。

## 原 Sites 站点

旧站点 `letou-group-lab-p8ref` 已关闭公开访问，只允许所有者访问，尚未永久删除。当前连接工具不提供永久删除操作；所有者可到 [ChatGPT Sites 管理页](https://chatgpt.com/sites) 找到“大乐透 · 分组研究台”，选择 Delete site，输入该 slug 并执行 Permanently delete。访问限制不会删除旧项目或数据库，彻底移除需要永久删除站点。
