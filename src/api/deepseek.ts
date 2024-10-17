// const token = 'sk-77aba63f67734e2096758f61043d01bd';
const token = 'sk-009fa6edcc774837b841c200ae3c3c1b'

async function deepseek(englishSentence: string, chineseSentence: string, word: string) {
  const egContent = `
          例子：
          # 提问
          英文：A marathon? how many superman movies are there?
          中文：马拉松到底有多少部超人电影啊 
          我想记忆marathon 这个单词

          # 回答
          1. 词义理解
          marathon（马拉松）：一种长跑比赛，标准距离为42.195公里（26.2英里）。引申为需要长时间或持续努力的活动。
          2. 发音练习
          发音：/ˈmærəθən/
          3. 词源记忆
          来源：来自古希腊的马拉松（Marathon）战役。传说希腊士兵菲迪皮得从马拉松战场跑回雅典，报捷讯，因而“马拉松”成为长跑的代名词。
          4. 联想记忆法
          形象联想：想象自己在参加一场42公里的长跑比赛，感受坚持和毅力。
          词根拆解：
          “marathon” 可以拆分为 “mar-a-thon”；
          联想到“马拉”（马拉） + “松”（松树，象征坚韧）——帮助记住需要持久和坚韧的特质。

          如果你理解了，请回答我准备好了
          回答只输出最终的JavaScript对象！
          `

  const content = `英文：${englishSentence}\n中文：${chineseSentence}\n我想记忆 ${word}`
  try {
    const data = {
      messages: [
        {
          content: egContent,
          role: 'system',
        },
        {
          content,
          role: 'user',
        },
      ],
      model: 'deepseek-chat',
      frequency_penalty: 0,
      max_tokens: 2048,
      presence_penalty: 0,
      stop: null,
      stream: false,
      temperature: 1,
      top_p: 1,
      logprobs: false,
      top_logprobs: null,
    }

    const startTime = new Date().getTime()
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const responseData = await response.json()
    const { choices } = responseData
    const answer = choices[0].message.content
    const endTime = new Date().getTime()
    const timeTaken = endTime - startTime
    console.log(`Time taken: ${timeTaken}ms`)
    return answer
  }
  catch (error) {
    console.error('Error:', error)
    throw error
  }
}

export {
  deepseek,
}
