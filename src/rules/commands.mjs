export const commandRules = {
  curl: {
    summary: "curl 用于向 URL 发起网络请求，也常用于下载内容或调用 HTTP API。",
    flags: {
      "-s": "silent 模式，隐藏进度条和非必要输出。",
      "-X": "指定 HTTP 请求方法，例如 GET、POST、PUT、DELETE。",
      "-H": "添加 HTTP 请求头。",
      "-d": "发送请求体数据，常用于 POST 或 PUT 请求。",
      "-o": "把响应内容写入指定文件。"
    }
  },
  git: {
    summary: "git 用于管理代码版本和仓库历史。",
    flags: {
      "--short": "用更简短的格式显示结果。",
      "--stat": "显示文件变更统计。",
      "-p": "显示详细补丁内容。"
    },
    subcommands: {
      status: "查看工作区和暂存区状态。",
      diff: "查看文件差异。",
      show: "查看某次提交或对象的详细内容。",
      add: "把文件加入暂存区。",
      commit: "创建一次提交。"
    }
  },
  ls: {
    summary: "ls 用于列出目录内容。",
    flags: {
      "-l": "使用长格式显示权限、大小、时间等信息。",
      "-a": "显示隐藏文件。",
      "-h": "用更易读的单位显示文件大小。"
    }
  },
  cat: {
    summary: "cat 用于输出文件内容，也常用于把多个文件内容串接起来。",
    flags: {
      "-n": "显示行号。"
    }
  },
  rg: {
    summary: "rg 是 ripgrep，用于快速搜索文件内容。",
    flags: {
      "-n": "显示匹配结果所在行号。",
      "-i": "忽略大小写。",
      "--files": "列出会被搜索的文件。"
    }
  },
  npm: {
    summary: "npm 用于管理 Node.js 项目的依赖和脚本。",
    subcommands: {
      run: "运行 package.json 中定义的脚本。",
      install: "安装项目依赖。",
      test: "运行测试脚本。"
    }
  },
  node: {
    summary: "node 用于运行 JavaScript 文件或脚本。"
  },
  python: {
    summary: "python 用于运行 Python 脚本或进入 Python 交互环境。"
  },
  docker: {
    summary: "docker 用于构建、运行和管理容器。"
  }
};

export const genericSymbols = {
  "|": "管道符，把前一个命令的标准输出交给后一个命令。",
  ">": "重定向，把输出写入文件并覆盖原内容。",
  ">>": "追加重定向，把输出追加到文件末尾。",
  "&&": "前一个命令成功后才执行后一个命令。",
  "||": "前一个命令失败后才执行后一个命令。"
};
