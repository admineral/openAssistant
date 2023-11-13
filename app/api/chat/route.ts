
import { OpenAI } from "openai";
import { OpenAIStream, StreamingTextResponse,} from "ai";
import { functions, runFunction } from "./functions";
import { checkRateLimit } from "./checkRateLimit";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: Request) {
  //console.log('Received request:', req);
  



  if (checkRateLimit) {
    const rateLimitResponse = await checkRateLimit(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }
  

  const { messages } = await req.json();
  //console.log('Messages:', messages);


  const systemMessage = {
    role: "system",
    content: "Du bist ein hilfreicher Assistent, der dazu ausgelegt ist, JSON-Daten auszugeben."
  };
  messages.push(systemMessage);

  // check if the conversation requires a function call to be made
  const initialResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages,
    stream: true,
    functions,
    function_call: "auto",
    response_format: { type: "json_object" },
  });
  //console.log('Initial response:', initialResponse);

  const stream = OpenAIStream(initialResponse, {
    experimental_onFunctionCall: async (
      { name, arguments: args },
      createFunctionCallMessages,
    ) => {
      console.log('Function call:', { name, args });
  
      let model = args.model; // initial model
      let result;
      try {
        result = await runFunction(name, args);
        console.log('Function result:', result);
      } catch (error: any) {
        if (error.message.includes('The requested model')) {
          model = 'gpt-4-1106-preview'; // default model
          result = await runFunction(name, { ...args, model });
          console.log('Function result:', result);
        } else {
          throw error; // re-throw the error if it's not about the model
        }
      }
  
      const newMessages = createFunctionCallMessages(JSON.stringify(result));
      //console.log('New messages:', newMessages);
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        stream: true,
        messages: [...messages, ...newMessages],
      });
      //console.log('Response:', response);
  
      return response;
    },
  });

  return new StreamingTextResponse(stream);
}