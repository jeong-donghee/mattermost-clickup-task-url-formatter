const express = require('express');
const clickup = require('@api/clickup');
const app = express();

try {
  clickup.auth('{API_TOKEN}');
} catch (err) {
  log(`❌ ClickUp 인증 실패: ${err.message}`, true);
  process.exit(1);
}

app.use(express.urlencoded({ extended: true }));

// 로그 출력용 함수
function log(message, isError = false) {
  const now = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO ';
  console[isError ? 'error' : 'log'](`[${now}] ${prefix} ${message}`);
}

app.post('/clickup-task', async (req, res) => {
  let { text } = req.body;

  // ClickUp URL 패턴 매칭
  const taskUrlPattern = /https:\/\/app\.clickup\.com\/t\/{TEAM_ID}\/([A-Za-z0-9_-]+)/g;

  // 중복 방지를 위한 맵
  const taskMap = new Map();

  const matches = [...text.matchAll(taskUrlPattern)];

  for (const match of matches) {
    const fullUrl = match[0];
    const taskId = match[1];

    if (taskMap.has(fullUrl)) continue;

    try {
      const { data } = await clickup.getTask({
        custom_task_ids: 'true',
        team_id: '{TEAM_ID}',
        task_id: taskId
      });

      const taskName = data.name || '';
      const markdown = `[${taskId}](${fullUrl}) ${taskName}`;
      taskMap.set(fullUrl, markdown);

      log(`✅ ${taskId} → "${taskName}"`);
    } catch (err) {
      log(`❌ ${taskId} API 조회 실패: ${err.message}`, true);
      taskMap.set(fullUrl, `[${taskId}](${fullUrl})`);
    }
  }

  // URL을 Markdown 링크 + Task 이름으로 치환
  for (const [from, to] of taskMap.entries()) {
    const escaped = from.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // 정규식 이스케이프
    text = text.replace(new RegExp(escaped, 'g'), to);
  }

  res.json({
    response_type: 'in_channel',
    text,
  });
});

app.listen(3000, () => {
  log('✅ 포트 3000에서 서버 실행 중');
});
