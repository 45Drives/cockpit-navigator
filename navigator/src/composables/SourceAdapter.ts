import { Source } from "../types/Source";
import { Location } from "../types/Location";
import { INotifications } from "../types/Notifications";

export interface SourceContext {
	notifications: INotifications;
}

export function defineSource<SourceType extends Source<Location>>(factory: (ctx: SourceContext) => SourceType) {
	return factory;
}
