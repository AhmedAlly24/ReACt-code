import { writeFileSync } from 'node:fs';
import readline from 'node:readline/promises';
import { ChatGroq } from '@langchain/groq';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { TavilySearch } from "@langchain/tavily";
import z from 'zod';


async function main() {
    const model = new ChatGroq({
        model: 'openai/gpt-oss-120b',
        temperature: 0,
    })
  
const search = new TavilySearch({
  maxResults: 3,
  topic: "general",
  
});
 const calendarEvents = tool(
        async ({ query }) => { 
            //Google calender logic goes here..

           return JSON.stringify([
            {title:'Meeting with sujooy',
                date:'5th November 2025',
                time:'2 PM',
                location:'Gmeet'}
        ]);
        },
        {
            name: 'get-calender-events',
            description: 'Call to get the calendar events.',
            schema: z.object({
                query: z.string().describe('The query to use in calendar event search.'),
            }),
        }
    );

    const checkpointer = new MemorySaver();
     
    const agent = createReactAgent({
        llm: model,
        tools: [search,calendarEvents],
        checkpointer:checkpointer
      
    });

    const rl =readline.createInterface({input:process.stdin,output:process.stdout});

    while(true){
    const userQuery = await rl.question("You :")
     
    if(userQuery === '/bye') break;

    const result = await agent.invoke(
            {
            messages: [
                   {
                 role:'system',
                content: `You are a personal assistant. Use provided tools to get the information 
                     if you don't have it. Current date and time: ${new Date().toUTCString()}`,
                   },
                    {
            role: 'user',
            content: userQuery
            },
          ],
},{ configurable: { thread_id: '1' } });
// console.log('result',result);
console.log('Assistant:',result.messages[result.messages.length-1].content)

}

rl.close();
    
// const drawableGraphGraphState = await agent.getGraph();
// const graphStateImage = await drawableGraphGraphState.drawMermaidPng();
// const graphStateArrayBuffer = await graphStateImage.arrayBuffer();

// const filePath = './graphState.png';
// writeFileSync(filePath, new Uint8Array(graphStateArrayBuffer))

}

main();































 
