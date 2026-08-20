export interface MessageBroker {
  connectProducer: () => Promise<void>;

  disConnectProducer: () => Promise<void>;
  sendMessgae: (topic: string, message: string) => Promise<void>;
  connectConsumer: () => Promise<void>;
  disconnectConsumer: () => Promise<void>;
  consumeMessage: (topics: string[], fromBeginning: boolean) => Promise<void>;
}
