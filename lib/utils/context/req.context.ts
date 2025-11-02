import { AsyncLocalStorage } from "node:async_hooks";
import { uuid } from "../id";

type RequestContext = {
	requestId: string;
	[key: string]: any;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getRequestId = (): string | null => {
	return requestContext.getStore()?.requestId ?? null;
};

export const getUserId = (): string | null => {
	return requestContext.getStore()?.userId ?? null;
};

export const withRequestId = (custom?: Record<string, any>) => {
	return () => {
		const requestId = uuid.generate();
		requestContext.enterWith({ requestId, ...(custom ?? {}) });
		return {};
	};
};
