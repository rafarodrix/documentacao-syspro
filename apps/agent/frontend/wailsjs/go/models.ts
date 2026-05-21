export namespace uistate {
	
	export class ActionResult {
	    accepted: boolean;
	    message: string;
	    target?: string;
	
	    static createFrom(source: any = {}) {
	        return new ActionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accepted = source["accepted"];
	        this.message = source["message"];
	        this.target = source["target"];
	    }
	}
	export class Notification {
	    id: string;
	    title: string;
	    message: string;
	    severity: string;
	    // Go type: time
	    occurred_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Notification(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.message = source["message"];
	        this.severity = source["severity"];
	        this.occurred_at = this.convertValues(source["occurred_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SetupStep {
	    key: string;
	    label: string;
	    status: string;
	    detail?: string;
	
	    static createFrom(source: any = {}) {
	        return new SetupStep(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.label = source["label"];
	        this.status = source["status"];
	        this.detail = source["detail"];
	    }
	}
	export class SetupStatus {
	    complete: boolean;
	    stage: string;
	    title: string;
	    summary: string;
	    progress_pct: number;
	    last_error?: string;
	    company_name?: string;
	    host_id?: string;
	    rustdesk_id?: string;
	    steps: SetupStep[];
	
	    static createFrom(source: any = {}) {
	        return new SetupStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.complete = source["complete"];
	        this.stage = source["stage"];
	        this.title = source["title"];
	        this.summary = source["summary"];
	        this.progress_pct = source["progress_pct"];
	        this.last_error = source["last_error"];
	        this.company_name = source["company_name"];
	        this.host_id = source["host_id"];
	        this.rustdesk_id = source["rustdesk_id"];
	        this.steps = this.convertValues(source["steps"], SetupStep);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Summary {
	    service_status: string;
	    user_visible: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Summary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.service_status = source["service_status"];
	        this.user_visible = source["user_visible"];
	    }
	}
	export class SupportContext {
	    companyId?: string;
	    companyDisplayName?: string;
	    hostId?: string;
	    hostAlias?: string;
	    rustdeskId?: string;
	    remoteAccessPassword?: string;
	    remoteStatus?: string;
	    remoteStatusText?: string;
	    conversationTags?: string[];
	    machineName?: string;
	    deviceId?: string;
	    hostname?: string;
	    os?: string;
	    localUsername?: string;
	    agentVersion?: string;
	    agentEnvironment?: string;
	    contactName?: string;
	    description?: string;
	
	    static createFrom(source: any = {}) {
	        return new SupportContext(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.companyId = source["companyId"];
	        this.companyDisplayName = source["companyDisplayName"];
	        this.hostId = source["hostId"];
	        this.hostAlias = source["hostAlias"];
	        this.rustdeskId = source["rustdeskId"];
	        this.remoteAccessPassword = source["remoteAccessPassword"];
	        this.remoteStatus = source["remoteStatus"];
	        this.remoteStatusText = source["remoteStatusText"];
	        this.conversationTags = source["conversationTags"];
	        this.machineName = source["machineName"];
	        this.deviceId = source["deviceId"];
	        this.hostname = source["hostname"];
	        this.os = source["os"];
	        this.localUsername = source["localUsername"];
	        this.agentVersion = source["agentVersion"];
	        this.agentEnvironment = source["agentEnvironment"];
	        this.contactName = source["contactName"];
	        this.description = source["description"];
	    }
	}
	export class SupportContextSyncResult {
	    accepted: boolean;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new SupportContextSyncResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accepted = source["accepted"];
	        this.message = source["message"];
	    }
	}
	export class SupportSession {
	    base_url: string;
	    website_token: string;
	    context: SupportContext;
	
	    static createFrom(source: any = {}) {
	        return new SupportSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.base_url = source["base_url"];
	        this.website_token = source["website_token"];
	        this.context = this.convertValues(source["context"], SupportContext);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

