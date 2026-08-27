import { NextResponse } from "next/server";

let onlineVisitors = 0;

export async function GET() {
  return NextResponse.json({
    online: onlineVisitors,
  });
}

export async function POST() {
  onlineVisitors += 1;

  return NextResponse.json({
    online: onlineVisitors,
  });
}

export async function DELETE() {
  onlineVisitors = Math.max(0, onlineVisitors - 1);

  return NextResponse.json({
    online: onlineVisitors,
  });
}
