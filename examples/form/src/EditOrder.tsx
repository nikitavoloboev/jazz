import { ID } from "jazz-tools";
import { OrderForm } from "./OrderForm.tsx";
import { useCoState } from "./main.tsx";
import { BubbleTeaOrder } from "./schema.ts";

export function EditOrder(props: { id: ID<BubbleTeaOrder> }) {
  const order = useCoState(BubbleTeaOrder, props.id, []);

  if (!order) return;

  return (
    <>
      <section>
        <h1>Edit your bubble tea order 🧋</h1>

        <OrderForm order={order} />
      </section>
    </>
  );
}
