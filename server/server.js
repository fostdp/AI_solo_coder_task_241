const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const dbPath = path.join(__dirname, 'db', 'sleep_records.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已连接到 SQLite 数据库');
    initDB();
  }
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      ownerId INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      familyId INTEGER,
      role TEXT DEFAULT 'member',
      token TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (familyId) REFERENCES families(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sleep_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      score INTEGER NOT NULL,
      totalDuration INTEGER NOT NULL,
      snoreCount INTEGER DEFAULT 0,
      talkCount INTEGER DEFAULT 0,
      events TEXT,
      noiseBaseline REAL DEFAULT 0,
      noiseAvg REAL DEFAULT 0,
      noisePeak REAL DEFAULT 0,
      noiseAnalysis TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS white_noise_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      volume REAL DEFAULT 0.5,
      isActive INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS family_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      familyId INTEGER NOT NULL,
      invitedBy INTEGER NOT NULL,
      inviteCode TEXT UNIQUE NOT NULL,
      expiresAt TEXT,
      isUsed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (familyId) REFERENCES families(id),
      FOREIGN KEY (invitedBy) REFERENCES users(id)
    )`);

    console.log('所有数据库表已就绪');
  });
}

function getCurrentUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE token = ?', [token], (err, user) => {
      if (err) reject(err);
      resolve(user);
    });
  });
}

app.post('/api/auth/register', (req, res) => {
  const { username, password, nickname } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const hashedPassword = hashPassword(password);
  
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    db.run('INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)', 
      [username, hashedPassword, nickname || username], 
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const token = generateToken();
        db.run('UPDATE users SET token = ? WHERE id = ?', [token, this.lastID], (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }
          
          res.status(201).json({
            id: this.lastID,
            username,
            nickname: nickname || username,
            token,
            familyId: null,
            role: 'member'
          });
        });
      }
    );
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const hashedPassword = hashPassword(password);
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', 
    [username, hashedPassword], 
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = generateToken();
      db.run('UPDATE users SET token = ? WHERE id = ?', [token, user.id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }
        
        res.json({
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          token,
          familyId: user.familyId,
          role: user.role
        });
      });
    }
  );
});

app.post('/api/auth/logout', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  db.run('UPDATE users SET token = NULL WHERE id = ?', [user.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: '已退出登录' });
  });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  res.json({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    familyId: user.familyId,
    role: user.role
  });
});

app.post('/api/families', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: '家庭名称不能为空' });
  }

  if (user.familyId) {
    return res.status(400).json({ error: '您已属于一个家庭' });
  }

  db.run('INSERT INTO families (name, ownerId) VALUES (?, ?)', [name, user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const familyId = this.lastID;
    db.run('UPDATE users SET familyId = ?, role = ? WHERE id = ?', [familyId, 'owner', user.id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      
      res.status(201).json({
        id: familyId,
        name,
        role: 'owner'
      });
    });
  });
});

app.post('/api/families/invite', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  if (!user.familyId || user.role !== 'owner') {
    return res.status(403).json({ error: '只有家庭管理员可以创建邀请码' });
  }

  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.run('INSERT INTO family_invites (familyId, invitedBy, inviteCode, expiresAt) VALUES (?, ?, ?, ?)',
    [user.familyId, user.id, inviteCode, expiresAt],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.status(201).json({
        inviteCode,
        expiresAt,
        familyId: user.familyId
      });
    }
  );
});

app.post('/api/families/join', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: '邀请码不能为空' });
  }

  if (user.familyId) {
    return res.status(400).json({ error: '您已属于一个家庭' });
  }

  db.get('SELECT * FROM family_invites WHERE inviteCode = ? AND isUsed = 0 AND expiresAt > datetime(\'now\')',
    [inviteCode.toUpperCase()],
    (err, invite) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!invite) {
        return res.status(400).json({ error: '邀请码无效或已过期' });
      }

      db.serialize(() => {
        db.run('UPDATE family_invites SET isUsed = 1 WHERE id = ?', [invite.id]);
        db.run('UPDATE users SET familyId = ? WHERE id = ?', [invite.familyId, user.id], (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }
          
          res.json({
            message: '成功加入家庭',
            familyId: invite.familyId
          });
        });
      });
    }
  );
});

app.get('/api/families/members', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  if (!user.familyId) {
    return res.status(400).json({ error: '您还没有加入任何家庭' });
  }

  db.all('SELECT id, username, nickname, role, createdAt FROM users WHERE familyId = ?',
    [user.familyId],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json(members);
    }
  );
});

app.get('/api/families/summary', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  if (!user.familyId) {
    return res.status(400).json({ error: '您还没有加入任何家庭' });
  }

  db.all(`
    SELECT 
      u.id,
      u.nickname,
      (SELECT score FROM sleep_records WHERE userId = u.id ORDER BY date DESC LIMIT 1) as lastScore,
      (SELECT date FROM sleep_records WHERE userId = u.id ORDER BY date DESC LIMIT 1) as lastDate,
      (SELECT COUNT(*) FROM sleep_records WHERE userId = u.id) as totalRecords,
      (SELECT AVG(score) FROM sleep_records WHERE userId = u.id) as avgScore
    FROM users u
    WHERE u.familyId = ?
    ORDER BY u.id
  `, [user.familyId], (err, summaries) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json(summaries.map(s => ({
      ...s,
      avgScore: s.avgScore ? Math.round(s.avgScore) : null
    })));
  });
});

app.get('/api/families/member/:memberId/records', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录' });
  }
  
  if (!user.familyId) {
    return res.status(400).json({ error: '您还没有加入任何家庭' });
  }

  const memberId = parseInt(req.params.memberId);
  
  db.get('SELECT familyId FROM users WHERE id = ?', [memberId], (err, member) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!member || member.familyId !== user.familyId) {
      return res.status(403).json({ error: '无权查看该成员的记录' });
    }

    db.all('SELECT * FROM sleep_records WHERE userId = ? ORDER BY date DESC LIMIT 30',
      [memberId],
      (err, records) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json(records.map(row => ({
          ...row,
          events: JSON.parse(row.events || '[]'),
          noiseAnalysis: row.noiseAnalysis ? JSON.parse(row.noiseAnalysis) : null
        })));
      }
    );
  });
});

app.post('/api/sleep-records', async (req, res) => {
  const user = await getCurrentUser(req);
  const { date, startTime, endTime, score, totalDuration, snoreCount, talkCount, events, noiseBaseline, noiseAvg, noisePeak, noiseAnalysis } = req.body;
  
  const userId = user ? user.id : null;
  
  const stmt = db.prepare(`INSERT INTO sleep_records 
    (userId, date, startTime, endTime, score, totalDuration, snoreCount, talkCount, events, noiseBaseline, noiseAvg, noisePeak, noiseAnalysis) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  stmt.run(
    userId, date, startTime, endTime, score, totalDuration, snoreCount, talkCount, 
    JSON.stringify(events || []),
    noiseBaseline || 0,
    noiseAvg || 0,
    noisePeak || 0,
    JSON.stringify(noiseAnalysis || null),
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, message: '记录已保存' });
    }
  );
  stmt.finalize();
});

app.get('/api/sleep-records', async (req, res) => {
  const user = await getCurrentUser(req);
  const userId = user ? user.id : null;
  
  let query = 'SELECT * FROM sleep_records';
  let params = [];
  
  if (userId) {
    query += ' WHERE userId = ?';
    params.push(userId);
  } else {
    query += ' WHERE userId IS NULL';
  }
  
  query += ' ORDER BY date DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const records = rows.map(row => ({
      ...row,
      events: JSON.parse(row.events || '[]'),
      noiseAnalysis: row.noiseAnalysis ? JSON.parse(row.noiseAnalysis) : null
    }));
    
    res.json(records);
  });
});

app.get('/api/sleep-records/:id', async (req, res) => {
  const user = await getCurrentUser(req);
  const recordId = req.params.id;
  
  db.get('SELECT * FROM sleep_records WHERE id = ?', [recordId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    if (user && row.userId && row.userId !== user.id) {
      return res.status(403).json({ error: '无权查看此记录' });
    }
    
    res.json({
      ...row,
      events: JSON.parse(row.events || '[]'),
      noiseAnalysis: row.noiseAnalysis ? JSON.parse(row.noiseAnalysis) : null
    });
  });
});

app.delete('/api/sleep-records/:id', async (req, res) => {
  const user = await getCurrentUser(req);
  const recordId = req.params.id;
  
  db.get('SELECT userId FROM sleep_records WHERE id = ?', [recordId], (err, record) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    
    if (user && record.userId && record.userId !== user.id) {
      return res.status(403).json({ error: '无权删除此记录' });
    }
    
    db.run('DELETE FROM sleep_records WHERE id = ?', [recordId], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: '记录已删除' });
    });
  });
});

app.get('/api/noise-analysis', async (req, res) => {
  const user = await getCurrentUser(req);
  const userId = user ? user.id : null;
  
  let query = 'SELECT noiseBaseline, noiseAvg, noisePeak, noiseAnalysis, date FROM sleep_records';
  let params = [];
  
  if (userId) {
    query += ' WHERE userId = ?';
    params.push(userId);
  } else {
    query += ' WHERE userId IS NULL';
  }
  
  query += ' ORDER BY date DESC LIMIT 7';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const analysis = rows.map(row => ({
      ...row,
      noiseAnalysis: row.noiseAnalysis ? JSON.parse(row.noiseAnalysis) : null
    }));
    
    const avgNoise = analysis.length > 0 
      ? analysis.reduce((sum, r) => sum + (r.noiseAvg || 0), 0) / analysis.length 
      : 0;
    
    const level = avgNoise < 0.02 ? '安静' : avgNoise < 0.05 ? '轻微' : avgNoise < 0.1 ? '中等' : '嘈杂';
    
    const suggestions = generateNoiseSuggestions(avgNoise, analysis);
    
    res.json({
      recentRecords: analysis,
      avgNoise,
      level,
      suggestions
    });
  });
});

function generateNoiseSuggestions(avgNoise, records) {
  const suggestions = [];
  
  if (avgNoise > 0.08) {
    suggestions.push({
      type: 'ac',
      icon: '❄️',
      title: '空调/风扇噪音',
      description: '检测到持续的低频噪音，可能来自空调或风扇。建议调整风向或使用睡眠模式。',
      action: '尝试降低空调风速或使用定时器'
    });
  }
  
  if (avgNoise > 0.05 && avgNoise <= 0.08) {
    suggestions.push({
      type: 'traffic',
      icon: '🚗',
      title: '环境噪音',
      description: '环境噪音水平偏高，可能影响深睡质量。',
      action: '可以考虑使用耳塞或白噪音机'
    });
  }
  
  const hasHighPeaks = records.some(r => r.noisePeak > 0.2);
  if (hasHighPeaks) {
    suggestions.push({
      type: 'peaks',
      icon: '⚡',
      title: '突发性噪音',
      description: '检测到突发性噪音峰值，可能会中断睡眠。',
      action: '检查是否有夜间活动的设备需要关闭'
    });
  }
  
  const snoreHigh = records.some(r => {
    const na = r.noiseAnalysis;
    return na && na.snoreCount > 5;
  });
  if (snoreHigh) {
    suggestions.push({
      type: 'snore',
      icon: '💤',
      title: '频繁鼾声',
      description: '检测到频繁的鼾声，可能影响您或伴侣的睡眠。',
      action: '建议尝试侧卧睡眠或咨询医生'
    });
  }
  
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'excellent',
      icon: '✨',
      title: '睡眠环境良好',
      description: '您的睡眠环境噪音水平在理想范围内。',
      action: '继续保持良好的睡眠习惯！'
    });
  }
  
  return suggestions;
}

app.get('/api/white-noise/presets', async (req, res) => {
  const presets = [
    { id: 'rain', name: '雨声', type: 'rain', icon: '🌧️', defaultVolume: 0.6 },
    { id: 'ocean', name: '海浪', type: 'ocean', icon: '🌊', defaultVolume: 0.5 },
    { id: 'forest', name: '森林', type: 'forest', icon: '🌲', defaultVolume: 0.4 },
    { id: 'fire', name: '篝火', type: 'fire', icon: '🔥', defaultVolume: 0.5 },
    { id: 'wind', name: '微风', type: 'wind', icon: '🍃', defaultVolume: 0.3 },
    { id: 'brown', name: '棕噪音', type: 'brown', icon: '📻', defaultVolume: 0.4 },
    { id: 'pink', name: '粉噪音', type: 'pink', icon: '🎵', defaultVolume: 0.4 },
    { id: 'white', name: '白噪音', type: 'white', icon: '⚪', defaultVolume: 0.3 }
  ];
  
  res.json(presets);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`请在浏览器中打开 http://localhost:${PORT} 使用应用`);
});
