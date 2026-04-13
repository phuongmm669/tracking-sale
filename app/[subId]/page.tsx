"use client";

import { use } from "react";
import OrdersByStatus from "./OrdersByStatus";

export default function SubIdPage(props: PageProps<"/[subId]">) {
  const { subId } = use(props.params);
  return <OrdersByStatus subId={subId} />;
}
