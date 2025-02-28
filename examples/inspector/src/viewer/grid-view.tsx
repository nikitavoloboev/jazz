import clsx from "clsx";
import { CoID, LocalNode, RawCoValue } from "cojson";
import { JsonObject } from "cojson";
import { ResolveIcon } from "./type-icon";
import { PageInfo, isCoId } from "./types";
import { CoMapPreview, ValueRenderer } from "./value-renderer";

export function GridView({
  data,
  onNavigate,
  node,
}: {
  data: JsonObject;
  onNavigate: (pages: PageInfo[]) => void;
  node: LocalNode;
}) {
  const entries = Object.entries(data);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
      {entries.map(([key, child], childIndex) => (
        <div
          key={childIndex}
          className={clsx(
            "bg-gray-100 p-4 rounded-2xl transition-colors overflow-hidden",
            isCoId(child)
              ? "bg-white border hover:bg-opacity-50 transition-opacity duration-600 cursor-pointer shadow-sm group"
              : "bg-gray-50",
          )}
          onClick={() =>
            isCoId(child) &&
            onNavigate([{ coId: child as CoID<RawCoValue>, name: key }])
          }
        >
          <h3 className="truncate">
            {isCoId(child) ? (
              <span className="font-medium flex justify-between items-center">
                <div className="flex-1 mr-2 break-all font-semibold max-w-full capitalize">
                  {key}
                </div>
                <div className="p-2 text-xs bg-gray-100 group-hover:bg-white rounded-full transition-colors duration-300">
                  <ResolveIcon coId={child as CoID<RawCoValue>} node={node} />
                </div>
              </span>
            ) : (
              <span className="truncate">{key}</span>
            )}
          </h3>

          <div className="mt-2 text-sm">
            {isCoId(child) ? (
              <div className="break-all max-w-full">
                <CoMapPreview coId={child as CoID<RawCoValue>} node={node} />
              </div>
            ) : (
              <ValueRenderer
                json={child}
                onCoIDClick={(coId) => {
                  onNavigate([{ coId, name: key }]);
                }}
                compact
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
