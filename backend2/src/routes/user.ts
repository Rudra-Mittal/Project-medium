import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { signin,signup } from '@rudra_mittal/input-validation';

export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    }
    Variables: {
        prisma: PrismaClient
    }
}>();
userRouter.use("*",async(c,next)=>{
  const prisma = await new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  // @ts-ignore
  c.set("prisma",prisma);
  return next();

})
userRouter.post('/signup', async (c) => {
  const {error}= signup.safeParse(await c.req.json()); 
  if(error){
    c.status(400);
    return c.json({error:error.message});
  }
  const body = await c.req.json();
  const prisma = c.get("prisma");
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });
    const token = await sign({ id: user.id }, c.env.JWT_SECRET)
    return c.json({
      jwt: token
    })
})
  
userRouter.post('/signin', async (c) => {
  const {error}= signin.safeParse(await c.req.json());
  if(error){
    c.status(400);
    return c.json({error:error.message});
  }
  const prisma = c.get("prisma");
    const body = await c.req.json();
    const user = await prisma.user.findUnique({
        where: {
            email: body.email,
            password: body.password
        }
    });

    if (!user) {
        c.status(403);
        return c.json({ error: "user not found" });
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({ jwt });
})