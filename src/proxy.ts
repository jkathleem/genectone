import { NextRequest, NextResponse } from "next/server";
import { canAccessPath } from "@/modules/auth/permissions";
import { findUserByToken, SESSION_COOKIE } from "@/modules/auth/session";
export async function proxy(request: NextRequest) {
  const pathname=request.nextUrl.pathname,user=await findUserByToken(request.cookies.get(SESSION_COOKIE)?.value);
  if(pathname==="/login")return user?NextResponse.redirect(new URL("/",request.url)):NextResponse.next();
  if(!user)return NextResponse.redirect(new URL("/login",request.url));
  if(!canAccessPath(user.role,pathname))return NextResponse.redirect(new URL("/?error=acesso-negado",request.url));
  return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"]};
