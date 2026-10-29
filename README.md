# M Deu

请帮我开发一个个人德语学习工作台网站，名称为「Mein Deutsch Workspace」。

我是个人用户，没有编程基础，希望网站能够长期使用，并且方便后续增加功能。

网站使用中文界面，德语内容正常显示。

整体设计采用类似 Notion 的简洁风格，左侧固定导航栏，右侧为主要内容区域。

第一版包含以下功能：

模块一：德语单词库

支持添加德语单词。

每条单词记录包含德语原词、中文释义、词性、复数形式、例句、添加时间。

支持给单词添加标签。

支持按照 A1、A2、B1、B2、C1 等级分类。

支持搜索、编辑和删除单词。

支持标记掌握状态：未掌握、学习中、已掌握。

预留 AI 自动翻译功能入口，但第一版暂时使用手动填写，不需要连接 AI API。

模块二：德语错题库

支持创建错题记录。

每条记录包含题目、错误答案、正确答案、错误原因、知识点分类和日期。

支持上传题目截图。

支持直接通过 Ctrl+V 粘贴截图。

支持错题分类，例如语法、词汇、阅读、听力。

支持标记复习状态。

支持搜索、编辑、删除错题。

模块三：截图笔记库

支持创建学习笔记。

每条笔记包含标题、分类、标签、备注和创建时间。

支持直接 Ctrl+V 粘贴截图。

支持上传本地图片。

一条笔记可以包含多张截图。

支持查看大图。

支持按照分类和标签筛选。

支持搜索、编辑和删除笔记。

首页功能

显示单词总数。

显示错题总数及待复习数量。

显示笔记总数。

提供快速添加单词、错题和截图笔记的按钮。

显示最近添加的学习记录。

技术要求

第一版主要在个人电脑上使用。

暂时不需要用户注册登录。

请先使用浏览器本地存储保存文字数据，并为截图等图片设计可靠的本地存储方式，例如 IndexedDB，不要把大量图片直接保存在 localStorage 中。

需要确保刷新页面后数据不会消失。

请增加数据导出与导入功能，方便以后备份和迁移。

所有按钮都需要有实际功能，而不是只能展示的静态页面。

请先完成可以正常使用的第一版，不要加入过多复杂功能。

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://m-deu.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/267eed3c-274d-5201-a7cd-dd7942004eac).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
