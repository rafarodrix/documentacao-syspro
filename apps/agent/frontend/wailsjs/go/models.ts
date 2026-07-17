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
	export class AgentCapabilityView {
	    kind: string;
	    externalId?: string;
	    accessPassword?: string;
	    status?: string;
	    statusText?: string;
	    ready: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AgentCapabilityView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.externalId = source["externalId"];
	        this.accessPassword = source["accessPassword"];
	        this.status = source["status"];
	        this.statusText = source["statusText"];
	        this.ready = source["ready"];
	    }
	}
	export class AgentCapabilitiesView {
	    remote?: AgentCapabilityView;
	
	    static createFrom(source: any = {}) {
	        return new AgentCapabilitiesView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.remote = this.convertValues(source["remote"], AgentCapabilityView);
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
	
	export class AgentInstallationView {
	    companyId?: string;
	    companyName?: string;
	    hostId?: string;
	    hostAlias?: string;
	    contactName?: string;
	    description?: string;
	
	    static createFrom(source: any = {}) {
	        return new AgentInstallationView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.companyId = source["companyId"];
	        this.companyName = source["companyName"];
	        this.hostId = source["hostId"];
	        this.hostAlias = source["hostAlias"];
	        this.contactName = source["contactName"];
	        this.description = source["description"];
	    }
	}
	export class DeviceView {
	    deviceId?: string;
	    hostname?: string;
	    os?: string;
	    localUsername?: string;
	    machineName?: string;
	    agentVersion?: string;
	
	    static createFrom(source: any = {}) {
	        return new DeviceView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.deviceId = source["deviceId"];
	        this.hostname = source["hostname"];
	        this.os = source["os"];
	        this.localUsername = source["localUsername"];
	        this.machineName = source["machineName"];
	        this.agentVersion = source["agentVersion"];
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
	export class AgentSetupView {
	    complete: boolean;
	    stage: string;
	    title: string;
	    summary: string;
	    progressPct: number;
	    lastError?: string;
	    steps: SetupStep[];
	    device: DeviceView;
	    installation: AgentInstallationView;
	    capabilities: AgentCapabilitiesView;
	
	    static createFrom(source: any = {}) {
	        return new AgentSetupView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.complete = source["complete"];
	        this.stage = source["stage"];
	        this.title = source["title"];
	        this.summary = source["summary"];
	        this.progressPct = source["progressPct"];
	        this.lastError = source["lastError"];
	        this.steps = this.convertValues(source["steps"], SetupStep);
	        this.device = this.convertValues(source["device"], DeviceView);
	        this.installation = this.convertValues(source["installation"], AgentInstallationView);
	        this.capabilities = this.convertValues(source["capabilities"], AgentCapabilitiesView);
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
	export class SupportChannelView {
	    baseUrl: string;
	    websiteToken: string;
	    configured: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SupportChannelView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.baseUrl = source["baseUrl"];
	        this.websiteToken = source["websiteToken"];
	        this.configured = source["configured"];
	    }
	}
	export class AgentSupportView {
	    channel: SupportChannelView;
	    device: DeviceView;
	    installation: AgentInstallationView;
	    capabilities: AgentCapabilitiesView;
	    conversationTags: string[];
	
	    static createFrom(source: any = {}) {
	        return new AgentSupportView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.channel = this.convertValues(source["channel"], SupportChannelView);
	        this.device = this.convertValues(source["device"], DeviceView);
	        this.installation = this.convertValues(source["installation"], AgentInstallationView);
	        this.capabilities = this.convertValues(source["capabilities"], AgentCapabilitiesView);
	        this.conversationTags = source["conversationTags"];
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

}

