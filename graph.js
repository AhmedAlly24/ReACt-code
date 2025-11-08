

/**
 * 1. Bring in LLM
 * 2. Build graph 
 * 3.Invoke the agent
 * 4.Add the memory
 */
import readline from 'node:readline/promises';
import { ChatGroq } from '@langchain/groq';
import { TavilySearch } from "@langchain/tavily";
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import { MessagesAnnotation, StateGraph,END } from '@langchain/langgraph';
import { printGraph } from './utils.js';
import z from 'zod';
import { config } from 'node:process';

    /**
     * Memory
     */
     const checkpointer = new MemorySaver();

    /**  Tools */

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

const tools = [search, calendarEvents];
const toolNode = new ToolNode(tools);

/**
 * initialize the llm
 */
 const llm = new ChatGroq({
        model: 'openai/gpt-oss-120b',
        temperature: 0,
    }).bindTools(tools)


    async function callModel(state){
     // call the llm
   const response = await llm.invoke(state.messages)
    //   console.log('Response in callMode:',response)
     return {messages:[response]};
    }

    /***
     * ConditionalEdge
     */

     function shouldContinue(state){
    /***
     * Check the previous AI messages if tool call,'return tools
     * else return __end__
     */

    const lastMessage =state.messages[state.messages.length-1]

    if(lastMessage.tool_calls?.length){
     return 'tools'
    }

    //  console.log('messages',state.messages)

     return '__end__'
     }


    /**
     * Build the Graph
     */ 
    
    const graph = new StateGraph(MessagesAnnotation)
    .addNode('llm', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'llm')
    .addEdge('tools', 'llm')
    .addConditionalEdges('llm', shouldContinue, 
    { tools: 'tools', __end__: END }
    );
    
   const app =graph.compile({checkpointer}) 

    async function main(){
    let config ={configurable:{thread_id:'1'}}
        /**
         * PrintGraph
         */

    await printGraph(app, './customGraph.png');

    /**
     * Tke the user input
     */
     const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    while (true) {
        const userInput = await rl.question('You: ');

        if (userInput === '/bye') {
            break;
        }

        const result = await app.invoke(
            {
                messages: [{ role: 'user', content: userInput }],
            },
            config
        );

        const messages = result.messages;
        const final = messages[messages.length - 1];

        console.log('AI: ', final.content);
    }

    rl.close();
}

    main();