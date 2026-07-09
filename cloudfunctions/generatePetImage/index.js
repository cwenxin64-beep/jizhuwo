const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 150000
});

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const DEFAULT_MODEL = 'doubao-seedream-5-0-260128';
const REQUEST_TIMEOUT = 150000;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

const STYLE_PROMPTS = {
  'warm-oil': [
    '以参考照片中的宠物为唯一主体，保留它真实的脸部特征、毛色、耳朵形状和温柔神态。',
    '转换为细腻温暖的纪念油画，宠物坐在烛光与万寿菊围绕的花桥小径旁。',
    '使用暖橙、烛光金、深蓝夜空和暖棕色，画面安静、治愈、克制。',
    '竖版 3:4 构图，主体完整清晰，不增加文字、边框、第二只动物或恐怖元素。'
  ].join(''),
  'healing-illustration': [
    '以参考照片中的宠物为唯一主体，准确保留它的脸部特征、毛色和可辨识神态。',
    '转换为柔和精致的童话绘本插画，周围有少量万寿菊花瓣、星光和温暖月光。',
    '色彩温柔，细节清晰，有陪伴与怀念感，不做现代扁平图标。',
    '竖版 3:4 构图，不增加文字、边框、第二只动物或恐怖元素。'
  ].join(''),
  'fairy-3d': [
    '以参考照片中的宠物为唯一主体，准确保留它的毛色、脸型、耳朵和眼神。',
    '转换为精致可爱的童话 3D 动画电影质感，柔软毛发，暖烛光和轻微星光。',
    '背景融入万寿菊和木质小屋元素，氛围温暖、纪念、不过度卡通。',
    '竖版 3:4 构图，不增加文字、边框、第二只动物或恐怖元素。'
  ].join('')
};

function postJson(url, body, headers) {
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (response) => {
      const chunks = [];
      let totalBytes = 0;

      response.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > 2 * 1024 * 1024) {
          request.destroy(new Error('图片生成接口响应过大'));
          return;
        }
        chunks.push(chunk);
      });

      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;

        try {
          data = JSON.parse(text);
        } catch (error) {
          reject(new Error('图片生成接口返回了无法识别的数据'));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const upstreamMessage = data.error && data.error.message;
          reject(new Error(upstreamMessage || `图片生成接口请求失败（${response.statusCode}）`));
          return;
        }
        resolve(data);
      });
    });

    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy(new Error('图片生成接口请求超时'));
    });
    request.on('error', reject);
    request.end(payload);
  });
}

function downloadImage(url, redirectCount = 0) {
  if (redirectCount > 3) {
    return Promise.reject(new Error('生成图片下载重定向次数过多'));
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') {
    return Promise.reject(new Error('生成图片地址不是安全链接'));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(parsedUrl, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const location = response.headers.location;
        response.resume();
        if (!location) {
          reject(new Error('生成图片重定向地址为空'));
          return;
        }
        const nextUrl = new URL(location, parsedUrl).toString();
        downloadImage(nextUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`生成图片下载失败（${response.statusCode}）`));
        return;
      }

      const chunks = [];
      let totalBytes = 0;
      response.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_IMAGE_BYTES) {
          request.destroy(new Error('生成图片超过 30MB 限制'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        const contentType = String(response.headers['content-type'] || '').toLowerCase();
        resolve({
          content: Buffer.concat(chunks),
          extension: contentType.includes('png') ? 'png' : 'jpg'
        });
      });
    });

    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy(new Error('生成图片下载超时'));
    });
    request.on('error', reject);
  });
}

exports.main = async (event) => {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    throw new Error('云函数缺少 ARK_API_KEY 环境变量');
  }

  const sourceFileID = String(event.sourceFileID || '');
  const style = String(event.style || '');
  if (!sourceFileID.startsWith('cloud://') || !sourceFileID.includes('/ai-inputs/')) {
    throw new Error('上传照片的文件地址无效');
  }
  if (!STYLE_PROMPTS[style]) {
    throw new Error('所选艺术风格无效');
  }

  const wxContext = cloud.getWXContext();
  if (!wxContext.OPENID) {
    throw new Error('无法确认当前用户身份');
  }

  const sourceResult = await cloud.getTempFileURL({
    fileList: [sourceFileID]
  });
  const sourceInfo = sourceResult.fileList && sourceResult.fileList[0];
  if (!sourceInfo || !sourceInfo.tempFileURL || (sourceInfo.status && sourceInfo.status !== 0)) {
    throw new Error('无法读取上传的照片');
  }

  const generation = await postJson(API_URL, {
    model: process.env.ARK_MODEL || DEFAULT_MODEL,
    prompt: STYLE_PROMPTS[style],
    image: sourceInfo.tempFileURL,
    sequential_image_generation: 'disabled',
    response_format: 'url',
    size: '2K',
    stream: false,
    watermark: true
  }, {
    Authorization: `Bearer ${apiKey}`
  });

  if (generation.error) {
    throw new Error(generation.error.message || '图片生成服务返回错误');
  }

  const generated = generation.data && generation.data.find((item) => item && item.url);
  if (!generated || !generated.url) {
    const itemError = generation.data
      && generation.data.find((item) => item && item.error);
    throw new Error(
      (itemError && itemError.error && itemError.error.message)
      || '图片生成服务没有返回有效图片'
    );
  }

  const image = await downloadImage(generated.url);
  const safeOpenID = wxContext.OPENID.replace(/[^a-zA-Z0-9_-]/g, '');
  const cloudPath = [
    'ai-results',
    safeOpenID,
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${image.extension}`
  ].join('/');
  const uploadResult = await cloud.uploadFile({
    cloudPath,
    fileContent: image.content
  });
  const resultUrl = await cloud.getTempFileURL({
    fileList: [uploadResult.fileID]
  });
  const resultInfo = resultUrl.fileList && resultUrl.fileList[0];

  if (!resultInfo || !resultInfo.tempFileURL) {
    throw new Error('生成图片已保存，但暂时无法读取');
  }

  return {
    ok: true,
    fileID: uploadResult.fileID,
    tempFileURL: resultInfo.tempFileURL,
    size: generated.size || ''
  };
};
