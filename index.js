// AWS Services Catalog Metadata & Formulas
const CATALOG_METADATA = {
  ec2: {
    name: 'EC2 虛擬主機',
    category: 'compute',
    icon: 'server',
    badge: 'Compute',
    isPublic: true,
    description: 'Amazon Elastic Compute Cloud (EC2) 提供安全且可調整大小的雲端虛擬伺服器，是雲端運算的核心。',
    defaultConfig: {
      instance_type: 't3.micro',
      count: 1,
      ebs_size: 20,
      is_reserved: false
    },
    controls: [
      { id: 'instance_type', label: '實例規格 (Instance Type)', type: 'select', options: [
          { value: 't3.micro', label: 't3.micro (2 vCPU, 1 GiB) - 測試用', price: 0.0104 },
          { value: 't3.medium', label: 't3.medium (2 vCPU, 4 GiB) - 輕量生產', price: 0.0416 },
          { value: 'm5.large', label: 'm5.large (2 vCPU, 8 GiB) - 標準負載', price: 0.096 },
          { value: 'c6g.2xlarge', label: 'c6g.2xlarge (8 vCPU, 16 GiB) - 高效能', price: 0.272 }
        ]
      },
      { id: 'count', label: '執行個體數量 (Instances Count)', type: 'range', min: 1, max: 10, step: 1 },
      { id: 'ebs_size', label: '硬碟大小 (EBS Storage Size)', type: 'range', min: 8, max: 1000, step: 10, unit: 'GB' },
      { id: 'is_reserved', label: '預留實例 (1年期 40% 折扣)', type: 'switch' }
    ],
    calculateCost: (config) => {
      const option = CATALOG_METADATA.ec2.controls[0].options.find(o => o.value === config.instance_type);
      const hourlyPrice = option ? option.price : 0.0104;
      const ec2Cost = config.count * hourlyPrice * 730;
      const ebsCost = config.count * config.ebs_size * 0.08; // $0.08 per GB-month
      const total = ec2Cost + ebsCost;
      return config.is_reserved ? total * 0.6 : total;
    },
    terraform: (config) => `resource "aws_instance" "app_node" {
  ami           = "ami-0c55b159cbfafe1f0" # Amazon Linux 2023
  instance_type = "${config.instance_type}"
  count         = ${config.count}

  root_block_device {
    volume_size = ${config.ebs_size}
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "CostLab-EC2-Server"
    Env  = "dev"
  }
}`,
    awscli: (config) => `aws ec2 run-instances \\
  --image-id ami-0c55b159cbfafe1f0 \\
  --instance-type ${config.instance_type} \\
  --count ${config.count} \\
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":${config.ebs_size},"VolumeType":"gp3","Encrypted":true}}]' \\
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CostLab-EC2}]'`
  },

  lambda: {
    name: 'Lambda 函數',
    category: 'compute',
    icon: 'zap',
    badge: 'Serverless',
    isPublic: true,
    description: 'AWS Lambda 讓您無需管理伺服器即可運行代碼。您只需為使用的運算時間付費，是 Serverless 架構的首選。',
    defaultConfig: {
      invocations: 1, // in millions
      memory: 512, // MB
      duration: 100 // ms
    },
    controls: [
      { id: 'invocations', label: '每月調用次數 (Monthly Requests)', type: 'range', min: 0.1, max: 100, step: 0.5, scale: 'M', unit: '次' },
      { id: 'memory', label: '配置記憶體大小 (Allocated Memory)', type: 'select', options: [
          { value: 128, label: '128 MB' },
          { value: 512, label: '512 MB' },
          { value: 1536, label: '1536 MB (1.5 GB)' },
          { value: 3072, label: '3072 MB (3 GB)' }
        ]
      },
      { id: 'duration', label: '平均執行時間 (Avg. Execution Duration)', type: 'range', min: 20, max: 2000, step: 20, unit: 'ms' }
    ],
    calculateCost: (config) => {
      const memoryRatio = config.memory / 1024;
      const seconds = config.duration / 1000;
      const computeGbSec = config.invocations * 1000000 * memoryRatio * seconds;
      const computeCost = computeGbSec * 0.0000166667;
      const requestCost = config.invocations * 0.20; // $0.20 per million requests
      return Math.max(0, computeCost + requestCost);
    },
    terraform: (config) => `resource "aws_lambda_function" "api_handler" {
  filename      = "lambda_function_payload.zip"
  function_name = "api_handler"
  role          = aws_iam_role.iam_for_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  memory_size = ${config.memory}
  timeout     = ${Math.ceil(config.duration / 1000) + 2}

  environment {
    variables = {
      ENV = "dev"
    }
  }
}`,
    awscli: (config) => `aws lambda create-function \\
  --function-name api-handler \\
  --runtime nodejs18.x \\
  --role arn:aws:iam::123456789012:role/lambda-ex \\
  --handler index.handler \\
  --zip-file fileb://function.zip \\
  --memory-size ${config.memory} \\
  --timeout ${Math.ceil(config.duration / 1000) + 2}`
  },

  rds: {
    name: 'RDS 關聯式資料庫',
    category: 'database',
    icon: 'database',
    badge: 'Database',
    isPublic: false,
    description: 'Amazon Relational Database Service (RDS) 讓您在雲端中設定、操作和調整關聯式資料庫（如 MySQL, Postgres, SQL Server）變得簡單。',
    defaultConfig: {
      db_instance: 'db.t3.micro',
      storage: 20,
      multi_az: false
    },
    controls: [
      { id: 'db_instance', label: '資料庫規格 (Instance Type)', type: 'select', options: [
          { value: 'db.t3.micro', label: 'db.t3.micro (2 vCPU, 1 GiB) - 測試用', price: 0.017 },
          { value: 'db.t3.medium', label: 'db.t3.medium (2 vCPU, 4 GiB) - 輕量生產', price: 0.068 },
          { value: 'db.m5.large', label: 'db.m5.large (2 vCPU, 8 GiB) - 標準業務', price: 0.175 }
        ]
      },
      { id: 'storage', label: '分配儲存空间 (Allocated Storage)', type: 'range', min: 20, max: 500, step: 10, unit: 'GB' },
      { id: 'multi_az', label: 'Multi-AZ 高可用部署 (兩倍費用)', type: 'switch' }
    ],
    calculateCost: (config) => {
      const option = CATALOG_METADATA.rds.controls[0].options.find(o => o.value === config.db_instance);
      const hourlyPrice = option ? option.price : 0.017;
      const rdsCost = hourlyPrice * 730;
      const storageCost = config.storage * 0.115; // $0.115 per GB-month
      const total = rdsCost + storageCost;
      return config.multi_az ? total * 2 : total;
    },
    terraform: (config) => `resource "aws_db_instance" "db" {
  allocated_storage    = ${config.storage}
  db_name              = "appdb"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "${config.db_instance}"
  username             = "dbadmin"
  password             = var.db_password
  
  multi_az             = ${config.multi_az}
  storage_type         = "gp3"
  skip_final_snapshot  = true
}`,
    awscli: (config) => `aws rds create-db-instance \\
  --db-instance-identifier appdb-instance \\
  --db-instance-class ${config.db_instance} \\
  --engine postgres \\
  --allocated-storage ${config.storage} \\
  --master-username dbadmin \\
  --master-user-password SuperSecretPassword \\
  ${config.multi_az ? '--multi-az' : '--no-multi-az'}`
  },

  dynamodb: {
    name: 'DynamoDB',
    category: 'database',
    icon: 'table-properties',
    badge: 'NoSQL',
    isPublic: false,
    description: 'Amazon DynamoDB 是一個全託管的 NoSQL 資料庫服務，可在任何規模下提供個位數毫秒級的延遲響應。',
    defaultConfig: {
      storage: 5, // GB
      wcu: 25,
      rcu: 25
    },
    controls: [
      { id: 'storage', label: '儲存數據容量 (Data Storage)', type: 'range', min: 1, max: 200, step: 5, unit: 'GB' },
      { id: 'wcu', label: '寫入容量單位 (Write Capacity Units - WCU)', type: 'range', min: 5, max: 500, step: 5 },
      { id: 'rcu', label: '讀取容量單位 (Read Capacity Units - RCU)', type: 'range', min: 5, max: 500, step: 5 }
    ],
    calculateCost: (config) => {
      const storageCost = Math.max(0, (config.storage - 25) * 0.25); // Free tier has 25GB free
      const wcuCost = config.wcu * 0.000728 * 730; // approx cost of provisioned WCU per hour
      const rcuCost = config.rcu * 0.000146 * 730; // approx cost of provisioned RCU per hour
      return storageCost + wcuCost + rcuCost;
    },
    terraform: (config) => `resource "aws_dynamodb_table" "db_table" {
  name           = "app-data-table"
  billing_mode   = "PROVISIONED"
  read_capacity  = ${config.rcu}
  write_capacity = ${config.wcu}
  hash_key       = "UserId"

  attribute {
    name = "UserId"
    type = "S"
  }

  tags = {
    Environment = "dev"
  }
}`,
    awscli: (config) => `aws dynamodb create-table \\
  --table-name app-data-table \\
  --attribute-definitions AttributeName=UserId,AttributeType=S \\
  --key-schema AttributeName=UserId,KeyType=HASH \\
  --provisioned-throughput ReadCapacityUnits=${config.rcu},WriteCapacityUnits=${config.wcu}`
  },

  s3: {
    name: 'S3 物件儲存',
    category: 'storage',
    icon: 'hard-drive',
    badge: 'Storage',
    isPublic: true,
    description: 'Amazon Simple Storage Service (S3) 提供業界領先的擴展性、數據可用性、安全性和效能，用於儲存任何規模的數據。',
    defaultConfig: {
      storage: 50, // GB
      s3_class: 'Standard'
    },
    controls: [
      { id: 'storage', label: '總儲存量 (Data Stored)', type: 'range', min: 5, max: 2000, step: 20, unit: 'GB' },
      { id: 's3_class', label: '儲存分類 (Storage Class)', type: 'segmented', options: ['Standard', 'IA (低頻)', 'Glacier (封存)'] }
    ],
    calculateCost: (config) => {
      let unitCost = 0.023; // Standard
      if (config.s3_class === 'IA (低頻)') unitCost = 0.0125;
      else if (config.s3_class === 'Glacier (封存)') unitCost = 0.004;
      return config.storage * unitCost;
    },
    terraform: (config) => `resource "aws_s3_bucket" "static_assets" {
  bucket = "costlab-app-assets-12345"

  tags = {
    Name = "Assets Bucket"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "bucket_lifecycle" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    id     = "archive-policy"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "${config.s3_class === 'IA (低頻)' ? 'STANDARD_IA' : config.s3_class === 'Glacier (封存)' ? 'GLACIER' : 'STANDARD'}"
    }
  }
}`,
    awscli: (config) => `aws s3api create-bucket \\
  --bucket costlab-app-assets-12345 \\
  --region us-east-1`
  },

  cloudfront: {
    name: 'CloudFront CDN',
    category: 'storage',
    icon: 'globe',
    badge: 'CDN',
    isPublic: true,
    description: 'Amazon CloudFront 是一個高速的內容傳遞網絡 (CDN) 服務，可安全地向全球客戶傳送數據、影片、應用程式和 API。',
    defaultConfig: {
      traffic: 100, // GB
      requests: 5 // Millions
    },
    controls: [
      { id: 'traffic', label: '出流量 (Data Transfer Out)', type: 'range', min: 10, max: 2000, step: 20, unit: 'GB' },
      { id: 'requests', label: '每月請求次數 (Requests)', type: 'range', min: 0.5, max: 50, step: 0.5, scale: 'M', unit: '次' }
    ],
    calculateCost: (config) => {
      const dataCost = config.traffic * 0.085; // $0.085 per GB
      const requestCost = config.requests * 0.75; // $0.75 per million
      return dataCost + requestCost;
    },
    terraform: (config) => `resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name              = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id                = "s3Origin"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}`,
    awscli: (config) => `# Note: CLI cloudfront deployments typically require a json input file due to complexity
aws cloudfront create-distribution \\
  --origin-domain-name costlab-app-assets-12345.s3.amazonaws.com \\
  --default-root-object index.html`
  },

  apigateway: {
    name: 'API Gateway',
    category: 'network',
    icon: 'git-fork',
    badge: 'API Gateway',
    isPublic: true,
    description: 'Amazon API Gateway 是一個全託管的服務，讓開發人員能夠輕鬆建立、發佈、維護、監控和保護任何規模的 API。',
    defaultConfig: {
      requests: 5 // Millions
    },
    controls: [
      { id: 'requests', label: '月請求量 (Monthly API Requests)', type: 'range', min: 1, max: 200, step: 5, scale: 'M', unit: '次' }
    ],
    calculateCost: (config) => {
      // $3.50 per million for REST APIs
      return config.requests * 3.50;
    },
    terraform: (config) => `resource "aws_apigatewayv2_api" "http_api" {
  name          = "http-lambda-gateway"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}`,
    awscli: (config) => `aws apigatewayv2 create-api \\
  --name http-lambda-gateway \\
  --protocol-type HTTP`
  },

  alb: {
    name: 'ALB 負載均衡',
    category: 'network',
    icon: 'shuffle',
    badge: 'Load Balancer',
    isPublic: true,
    description: 'Application Load Balancer (ALB) 負責將入站的應用程式流量分流至多個目標（如 EC2 執行個體、容器和 IP 地址）。',
    defaultConfig: {
      count: 1,
      traffic: 100 // GB
    },
    controls: [
      { id: 'count', label: '負載均衡器數量 (ALB Count)', type: 'range', min: 1, max: 3, step: 1 },
      { id: 'traffic', label: '處理流量大小 (Processed Data)', type: 'range', min: 10, max: 2000, step: 50, unit: 'GB' }
    ],
    calculateCost: (config) => {
      const albHourly = config.count * 0.0225 * 730;
      const lcuCost = config.traffic * 0.008; // LCU approximation
      return albHourly + lcuCost;
    },
    terraform: (config) => `resource "aws_lb" "app_alb" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = false

  tags = {
    Name = "AppALB"
  }
}`,
    awscli: (config) => `aws elbv2 create-load-balancer \\
  --name app-alb \\
  --subnets subnet-12345678 subnet-87654321 \\
  --security-groups sg-12345678`
  }
};

// Preset Configurations
const PRESETS = {
  empty: [],
  'basic-web': [
    { type: 'ec2', config: { instance_type: 't3.micro', count: 2, ebs_size: 30, is_reserved: false } },
    { type: 'rds', config: { db_instance: 'db.t3.micro', storage: 30, multi_az: false } },
    { type: 's3', config: { storage: 100, s3_class: 'Standard' } }
  ],
  'serverless': [
    { type: 'apigateway', config: { requests: 10 } },
    { type: 'lambda', config: { invocations: 10, memory: 512, duration: 150 } },
    { type: 'dynamodb', config: { storage: 15, wcu: 50, rcu: 50 } }
  ],
  'ha-enterprise': [
    { type: 'cloudfront', config: { traffic: 500, requests: 12 } },
    { type: 'alb', config: { count: 1, traffic: 500 } },
    { type: 'ec2', config: { instance_type: 't3.medium', count: 4, ebs_size: 50, is_reserved: true } },
    { type: 'rds', config: { db_instance: 'db.t3.medium', storage: 100, multi_az: true } },
    { type: 's3', config: { storage: 500, s3_class: 'Standard' } }
  ]
};

// Global App State
const state = {
  services: [],
  selectedId: null,
  activeTab: 'terraform',
  chart: null
};

// Counter Helper for smooth numbers animation
function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = (progress * (end - start) + start).toFixed(2);
    obj.innerHTML = parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Generate random unique ID
function generateId(prefix) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Initialize Cost Chart
function initChart() {
  const ctx = document.getElementById('costBreakdownChart').getContext('2d');
  
  // Set global Chart.js defaults for dark mode
  Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
  Chart.defaults.font.family = 'Plus Jakarta Sans, sans-serif';

  state.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#06b6d4', // Compute
          '#10b981', // Database
          '#f59e0b', // Storage
          '#a855f7', // Network
        ],
        borderWidth: 1,
        borderColor: '#1e293b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return ` ${context.label}: $${context.raw.toFixed(2)}`;
            }
          }
        }
      },
      cutout: '75%'
    }
  });
}

// Render service nodes on the canvas
function renderCanvas() {
  const canvasGrid = document.getElementById('canvas-grid');
  const emptyState = document.getElementById('canvas-empty-state');
  
  // Clear old canvas nodes
  canvasGrid.innerHTML = '';
  
  if (state.services.length === 0) {
    emptyState.className = 'canvas-empty-state';
    return;
  } else {
    emptyState.className = 'canvas-empty-hidden';
  }

  state.services.forEach(service => {
    const meta = CATALOG_METADATA[service.type];
    const isSelected = service.id === state.selectedId;
    
    const node = document.createElement('div');
    node.className = `service-node ${isSelected ? 'selected' : ''}`;
    node.dataset.id = service.id;
    
    // Determine category styling
    let catClass = 'color-compute';
    if (meta.category === 'database') catClass = 'color-database';
    else if (meta.category === 'storage') catClass = 'color-storage';
    else if (meta.category === 'network') catClass = 'color-network';

    const subnetBadge = meta.isPublic 
      ? '<span class="service-node-badge public-node">Public</span>'
      : '<span class="service-node-badge private-node">Private</span>';

    node.innerHTML = `
      <div class="service-node-header">
        <i data-lucide="${meta.icon}" class="service-node-icon ${catClass}"></i>
        ${subnetBadge}
      </div>
      <div class="service-node-info">
        <h4>${meta.name}</h4>
        <span>${service.id}</span>
      </div>
      <div class="service-node-cost">
        <span class="node-cost-label">Est. Cost</span>
        <span class="node-cost-value">$${service.cost.toFixed(2)}<span>/mo</span></span>
      </div>
    `;

    // Click handler for selection
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      selectService(service.id);
    });

    canvasGrid.appendChild(node);
  });

  lucide.createIcons();
}

// Select a service and load its configuration into Inspector
function selectService(id) {
  state.selectedId = id;
  
  // Highlight selected node on canvas
  document.querySelectorAll('.service-node').forEach(node => {
    if (node.dataset.id === id) {
      node.classList.add('selected');
    } else {
      node.classList.remove('selected');
    }
  });

  const activeState = document.getElementById('inspector-active-state');
  const defaultState = document.getElementById('inspector-default-state');
  
  if (!id) {
    activeState.classList.add('hidden');
    defaultState.classList.remove('hidden');
    return;
  }

  defaultState.classList.add('hidden');
  activeState.classList.remove('hidden');

  const service = state.services.find(s => s.id === id);
  const meta = CATALOG_METADATA[service.type];

  // Set header info
  document.getElementById('inspector-service-name').innerText = meta.name;
  document.getElementById('inspector-service-id').innerText = service.id;
  const iconElem = document.getElementById('inspector-service-icon');
  iconElem.setAttribute('data-lucide', meta.icon);
  
  // Reset service category color on header icon
  iconElem.className = '';
  if (meta.category === 'compute') iconElem.classList.add('color-compute');
  else if (meta.category === 'database') iconElem.classList.add('color-database');
  else if (meta.category === 'storage') iconElem.classList.add('color-storage');
  else if (meta.category === 'network') iconElem.classList.add('color-network');

  // Build Configuration controls
  const controlsContainer = document.getElementById('inspector-config-controls');
  controlsContainer.innerHTML = '';

  meta.controls.forEach(ctrl => {
    const item = document.createElement('div');
    item.className = 'control-item';

    const currentVal = service.config[ctrl.id];
    let controlHtml = '';

    if (ctrl.type === 'range') {
      let displayVal = currentVal;
      if (ctrl.scale === 'M') displayVal = currentVal + 'M';
      if (ctrl.unit) displayVal = displayVal + ' ' + ctrl.unit;

      controlHtml = `
        <label for="ctrl-${ctrl.id}">
          <span>${ctrl.label}</span>
          <span id="val-${ctrl.id}">${displayVal}</span>
        </label>
        <input type="range" id="ctrl-${ctrl.id}" class="glass-range" 
               min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${currentVal}">
      `;
    } else if (ctrl.type === 'select') {
      const optionsHtml = ctrl.options.map(opt => 
        `<option value="${opt.value}" ${opt.value === currentVal ? 'selected' : ''}>${opt.label}</option>`
      ).join('');

      controlHtml = `
        <label for="ctrl-${ctrl.id}">${ctrl.label}</label>
        <select id="ctrl-${ctrl.id}" class="glass-select" style="width: 100%;">
          ${optionsHtml}
        </select>
      `;
    } else if (ctrl.type === 'switch') {
      controlHtml = `
        <label class="switch-label" for="ctrl-${ctrl.id}">
          <span>${ctrl.label}</span>
          <span class="switch-wrapper">
            <input type="checkbox" id="ctrl-${ctrl.id}" ${currentVal ? 'checked' : ''}>
            <span class="slider-round"></span>
          </span>
        </label>
      `;
    } else if (ctrl.type === 'segmented') {
      const buttonsHtml = ctrl.options.map(opt => 
        `<button class="segment-btn ${opt === currentVal ? 'active' : ''}" data-value="${opt}">${opt}</button>`
      ).join('');

      controlHtml = `
        <label>${ctrl.label}</label>
        <div class="segmented-control" id="ctrl-${ctrl.id}-container">
          ${buttonsHtml}
        </div>
      `;
    }

    item.innerHTML = controlHtml;
    controlsContainer.appendChild(item);

    // Event listeners
    const inputElem = document.getElementById(`ctrl-${ctrl.id}`);
    if (inputElem) {
      inputElem.addEventListener('input', (e) => {
        let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (e.target.type === 'range') {
          value = parseFloat(value);
          let labelText = value;
          if (ctrl.scale === 'M') labelText = value + 'M';
          if (ctrl.unit) labelText = labelText + ' ' + ctrl.unit;
          document.getElementById(`val-${ctrl.id}`).innerText = labelText;
        }
        updateServiceConfig(id, ctrl.id, value);
      });
      inputElem.addEventListener('change', (e) => {
        let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (e.target.type === 'range') value = parseFloat(value);
        updateServiceConfig(id, ctrl.id, value);
      });
    }

    // Segmented event listeners
    if (ctrl.type === 'segmented') {
      const container = document.getElementById(`ctrl-${ctrl.id}-container`);
      const buttons = container.querySelectorAll('.segment-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateServiceConfig(id, ctrl.id, btn.dataset.value);
        });
      });
    }
  });

  // Load code snippets
  updateCodeSnippets(service);

  // Load service info details
  document.getElementById('educational-details').innerHTML = `
    <h4>關於 ${meta.name}</h4>
    <p>${meta.description}</p>
    <h4>成本優化最佳實踐 (FinOps Key)</h4>
    <ul>
      ${meta.category === 'compute' ? '<li>考慮對穩定運行的工作負載使用預留實例 (RI) 或 Savings Plans，最高可省下 72% 費用。</li><li>利用彈性自動擴展 (Auto Scaling) 來匹配流量高峰，在離峰時間自動縮減主機。</li>' : ''}
      ${meta.category === 'database' ? '<li>RDS 關聯資料庫應謹慎選擇 Multi-AZ。對於開發測試環境，單節點部署已足夠。</li><li>DynamoDB 考慮對未知流量開啟 On-Demand 自動彈性計費，對預測穩定的流量使用 Provisioned 配合 Autoscaling。</li>' : ''}
      ${meta.category === 'storage' ? '<li>為 S3 設置生命週期管理規則 (Lifecycle Rules)，在 30 或 90 天後自動將舊數據轉移至 Infrequent Access 或 Glacier 深度存檔。</li><li>CloudFront 全球節點能夠極大減輕源站負載，減少源站傳出數據費。</li>' : ''}
    </ul>
  `;

  lucide.createIcons();
}

// Update specific config property on an active service
function updateServiceConfig(id, key, value) {
  const service = state.services.find(s => s.id === id);
  if (!service) return;

  service.config[key] = value;
  
  // Recalculate cost
  const meta = CATALOG_METADATA[service.type];
  service.cost = meta.calculateCost(service.config);
  
  // Update canvas node displays
  const node = document.querySelector(`.service-node[data-id="${id}"]`);
  if (node) {
    node.querySelector('.node-cost-value').innerHTML = `$${service.cost.toFixed(2)}<span>/mo</span>`;
  }

  // Update total costs & charts
  updateTotalCost();

  // Update dynamic code templates
  updateCodeSnippets(service);
}

// Render dynamic Terraform and AWS CLI code blocks
function updateCodeSnippets(service) {
  const meta = CATALOG_METADATA[service.type];
  document.getElementById('code-tf').innerText = meta.terraform(service.config);
  document.getElementById('code-cli').innerText = meta.awscli(service.config);
}

// Add a service type to canvas
function addService(type) {
  const meta = CATALOG_METADATA[type];
  if (!meta) return;

  const newService = {
    id: generateId(type),
    type: type,
    config: { ...meta.defaultConfig },
    cost: 0
  };
  
  newService.cost = meta.calculateCost(newService.config);
  state.services.push(newService);
  
  renderCanvas();
  selectService(newService.id);
  updateTotalCost();
}

// Delete a service from active canvas
function deleteService(id) {
  state.services = state.services.filter(s => s.id !== id);
  if (state.selectedId === id) {
    state.selectedId = null;
    selectService(null);
  }
  renderCanvas();
  updateTotalCost();
}

// Clear all active services
function resetCanvas() {
  state.services = [];
  state.selectedId = null;
  selectService(null);
  renderCanvas();
  updateTotalCost();
}

// Load preconfigured architectural templates
function loadPreset(presetName) {
  const pData = PRESETS[presetName];
  if (!pData) return;

  resetCanvas();
  
  pData.forEach(pItem => {
    const meta = CATALOG_METADATA[pItem.type];
    const newService = {
      id: generateId(pItem.type),
      type: pItem.type,
      config: { ...pItem.config },
      cost: 0
    };
    newService.cost = meta.calculateCost(newService.config);
    state.services.push(newService);
  });

  renderCanvas();
  if (state.services.length > 0) {
    selectService(state.services[0].id);
  }
  updateTotalCost();
}

// Calculate total costs, update legends, chart datasets, and FinOps insights
function updateTotalCost() {
  const costValElem = document.getElementById('cost-value');
  const costAnnualElem = document.getElementById('cost-annual-value');
  const currentTotal = parseFloat(costValElem.innerText.replace(/,/g, '')) || 0;
  
  // Calculate new total
  const newTotal = state.services.reduce((sum, s) => sum + s.cost, 0);
  
  // Smoothly animate total cost numbers
  animateValue(costValElem, currentTotal, newTotal, 400);
  costAnnualElem.innerText = `$${(newTotal * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Aggregate Category Costs
  const categoryCosts = {
    compute: 0,
    database: 0,
    storage: 0,
    network: 0
  };

  state.services.forEach(s => {
    const meta = CATALOG_METADATA[s.type];
    if (categoryCosts[meta.category] !== undefined) {
      categoryCosts[meta.category] += s.cost;
    } else {
      categoryCosts.storage += s.cost; // Fallback
    }
  });

  // Update Doughnut Chart
  const chartLabels = ['Compute', 'Database', 'Storage / CDN', 'Networking'];
  const chartData = [
    categoryCosts.compute,
    categoryCosts.database,
    categoryCosts.storage,
    categoryCosts.network
  ];

  if (state.chart) {
    state.chart.data.labels = chartLabels;
    state.chart.data.datasets[0].data = chartData;
    state.chart.update();
  }

  // Render Legends dynamically
  const legendContainer = document.getElementById('chart-legend');
  legendContainer.innerHTML = '';
  
  const colors = ['#06b6d4', '#10b981', '#f59e0b', '#a855f7'];
  chartLabels.forEach((label, idx) => {
    if (chartData[idx] > 0 || newTotal === 0) {
      const legItem = document.createElement('div');
      legItem.className = 'legend-item';
      legItem.innerHTML = `
        <span class="legend-color-dot" style="background: ${colors[idx]}"></span>
        <span class="legend-name">${label}:</span>
        <span class="legend-val">$${chartData[idx].toFixed(2)}</span>
      `;
      legendContainer.appendChild(legItem);
    }
  });

  // FinOps Advisory Rules Engine
  updateFinOpsInsights(categoryCosts, newTotal);
}

// FinOps Advisory Rules
function updateFinOpsInsights(categoryCosts, totalCost) {
  const optList = document.getElementById('optimization-list');
  optList.innerHTML = '';

  const insights = [];

  // Rule 1: High Compute Costs without Reservation
  const ec2Services = state.services.filter(s => s.type === 'ec2');
  const unreservedEc2Count = ec2Services.filter(s => !s.config.is_reserved).length;
  if (unreservedEc2Count > 0) {
    const potentialSaving = ec2Services
      .filter(s => !s.config.is_reserved)
      .reduce((sum, s) => sum + (s.cost * 0.4), 0); // 40% saving
      
    if (potentialSaving > 0) {
      insights.push({
        type: 'warn',
        text: `您有 ${unreservedEc2Count} 個 EC2 主機未啟用預留實例 (RI)。若轉為 1 年期預留合約，估計每月可省下 <strong>$${potentialSaving.toFixed(2)} USD</strong>。`
      });
    }
  }

  // Rule 2: Multi-AZ databases check
  const rdsServices = state.services.filter(s => s.type === 'rds');
  const multiAzCount = rdsServices.filter(s => s.config.multi_az).length;
  if (multiAzCount > 0 && totalCost > 150) {
    insights.push({
      type: 'warn',
      text: `偵測到生產級 RDS Multi-AZ 部署。請確保這不是非必要的開發/測試環境，以避免雙倍數據庫開銷。`
    });
  }

  // Rule 3: Storage tier checks
  const s3Services = state.services.filter(s => s.type === 's3');
  const standardS3Count = s3Services.filter(s => s.config.s3_class === 'Standard' && s.config.storage > 200).length;
  if (standardS3Count > 0) {
    insights.push({
      type: 'warn',
      text: `您的 S3 Standard 標準儲存桶容量較大。建議在 Terraform 中配置生命週期規則，將 30 天以上的冷數據轉移至低頻訪問檔 (Standard-IA) 以節省 45% 成本。`
    });
  }

  // Rule 4: Compute/DB sizing optimization suggestions
  const databaseTotal = categoryCosts.database;
  if (databaseTotal > totalCost * 0.6 && totalCost > 50) {
    insights.push({
      type: 'warn',
      text: `資料庫開銷佔比高達 ${(databaseTotal/totalCost * 100).toFixed(0)}%。若系統多為讀取密集型，可考慮對常態查詢設置 ElastiCache 快取服務來降低資料庫實例規格。`
    });
  }

  // Default Positive Feedback if no warnings
  if (insights.length === 0) {
    insights.push({
      type: 'ok',
      text: `<b>Excellent Work!</b> 您的架構經過了初步成本優化，未發現明顯的冗餘主機或浪費的配置。`
    });
  }

  insights.forEach(ins => {
    const li = document.createElement('li');
    if (ins.type === 'ok') {
      li.innerHTML = `<i data-lucide="check-circle" class="insight-ok"></i><span>${ins.text}</span>`;
    } else {
      li.innerHTML = `<i data-lucide="alert-triangle" class="insight-warn"></i><span>${ins.text}</span>`;
    }
    optList.appendChild(li);
  });

  lucide.createIcons();
}

// Wire Up Document Event Handlers
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Chart.js
  initChart();

  // Load default preset (basic-web)
  loadPreset('basic-web');

  // Wire presets selector
  const presetSelect = document.getElementById('preset-select');
  presetSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value);
  });

  // Wire catalog item add buttons
  document.querySelectorAll('.add-service-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addService(btn.dataset.serviceType);
    });
  });

  // Wire general actions
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('您確定要清空當前畫布上的所有 AWS 服務嗎？')) {
      resetCanvas();
      presetSelect.value = 'empty';
    }
  });

  document.getElementById('btn-delete-service').addEventListener('click', () => {
    if (state.selectedId) {
      deleteService(state.selectedId);
    }
  });

  // Wire Help Modal Dialog
  const helpDialog = document.getElementById('info-dialog');
  document.getElementById('btn-info').addEventListener('click', () => helpDialog.showModal());
  document.getElementById('btn-close-dialog').addEventListener('click', () => helpDialog.close());
  document.getElementById('btn-modal-ok').addEventListener('click', () => helpDialog.close());

  // Canvas selection deselect when clicking outer grid
  document.getElementById('canvas-grid').addEventListener('click', () => {
    state.selectedId = null;
    selectService(null);
  });

  // Inspector code tabs switcher
  document.querySelectorAll('.tab-header-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      // Toggle headers
      document.querySelectorAll('.tab-header-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      // Toggle content panel
      const targetTab = tabBtn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
      state.activeTab = targetTab;
    });
  });

  // Clipboard Copiers
  document.getElementById('btn-copy-tf').addEventListener('click', () => {
    const code = document.getElementById('code-tf').innerText;
    navigator.clipboard.writeText(code).then(() => {
      const copyBtn = document.getElementById('btn-copy-tf');
      copyBtn.innerHTML = '<i data-lucide="check" style="color:#10b981"></i>';
      lucide.createIcons();
      setTimeout(() => {
        copyBtn.innerHTML = '<i data-lucide="copy"></i>';
        lucide.createIcons();
      }, 2000);
    });
  });

  document.getElementById('btn-copy-cli').addEventListener('click', () => {
    const code = document.getElementById('code-cli').innerText;
    navigator.clipboard.writeText(code).then(() => {
      const copyBtn = document.getElementById('btn-copy-cli');
      copyBtn.innerHTML = '<i data-lucide="check" style="color:#10b981"></i>';
      lucide.createIcons();
      setTimeout(() => {
        copyBtn.innerHTML = '<i data-lucide="copy"></i>';
        lucide.createIcons();
      }, 2000);
    });
  });
});
