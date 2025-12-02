import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface OfferEmailProps {
    applicantName: string;
    position: string;
    startDate: string;
    salary: string;
    offerUrl: string;
}

export const OfferEmail = ({
    applicantName = "Applicant",
    position = "Registered Nurse",
    startDate = "2025-01-01",
    salary = "$85,000",
    offerUrl = "https://prolific-hr.com/offers/123",
}: OfferEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your Offer from Prolific Homecare</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
                        <Section className="mt-[32px]">
                            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Congratulations, {applicantName}!
                            </Heading>
                            <Text className="text-black text-[14px] leading-[24px]">
                                We are pleased to offer you the position of <strong>{position}</strong> at Prolific Homecare.
                            </Text>
                            <Text className="text-black text-[14px] leading-[24px]">
                                <strong>Start Date:</strong> {startDate}
                                <br />
                                <strong>Salary:</strong> {salary}
                            </Text>
                            <Section className="text-center mt-[32px] mb-[32px]">
                                <Button
                                    className="bg-[#3B82F6] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                                    href={offerUrl}
                                >
                                    View & Accept Offer
                                </Button>
                            </Section>
                            <Text className="text-black text-[14px] leading-[24px]">
                                We are excited to have you join our team!
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default OfferEmail;
