# generatePetImage 部署说明

1. 在微信开发者工具中打开云开发，并选择已经部署的 CloudBase 环境。
2. 右键 `cloudfunctions/generatePetImage`，选择“上传并部署：云端安装依赖”。
3. 在 CloudBase 控制台打开 `generatePetImage` 的函数配置。
4. 将运行环境设为 Node.js 18，超时时间设为 180 秒，内存设为 512MB。
5. 新增环境变量 `ARK_API_KEY`，值为重新生成的火山方舟 API Key。
6. 如需更换模型，可新增环境变量 `ARK_MODEL`；不设置时使用 `doubao-seedream-5-0-260128`。

不要把 API Key 写入小程序、代码文件或提交记录中。
